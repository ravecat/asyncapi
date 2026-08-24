import { run, type Input } from "@opalesce/core";
import { describe, expect, it } from "vitest";
import typescript from "../src/index.js";

async function schemaContents(input: Input, name: string): Promise<string> {
  const result = await run({ input, plugins: [typescript()] });
  const artifact = result.artifacts.find((candidate) =>
    candidate.path.endsWith(`/schemas/${name}.ts`),
  );
  if (artifact === undefined) {
    throw new Error(`Expected schema artifact ${name}.ts.`);
  }
  return artifact.contents;
}

const projectionInput = {
  asyncapi: "3.1.0",
  info: { title: "Projection", version: "1.0.0" },
  components: {
    schemas: {
      Base: {
        type: "object",
        required: ["id", "secret"],
        additionalProperties: false,
        properties: {
          id: { type: "string", readOnly: true },
          secret: { type: "string", writeOnly: true, description: "bad */ source" },
          note: { type: ["string", "null"], default: null, examples: ["hello"] },
        },
      },
      Extra: { type: "object", properties: { count: { type: "integer" } } },
      Combined: {
        allOf: [{ $ref: "#/components/schemas/Base" }, { $ref: "#/components/schemas/Extra" }],
      },
      Choice: {
        oneOf: [{ const: "created" }, { const: "processed" }],
      },
      Tuple: {
        type: "array",
        items: [{ type: "string" }, { type: "number" }],
      },
      StringMap: {
        type: "object",
        properties: { fixed: { type: "string" } },
        additionalProperties: { type: "string" },
      },
      MixedMap: {
        type: "object",
        properties: { fixed: { type: "number" } },
        additionalProperties: { type: "string" },
      },
      Left: {
        type: "object",
        properties: { right: { $ref: "#/components/schemas/Right" } },
      },
      Right: {
        type: "object",
        properties: { left: { $ref: "#/components/schemas/Left" } },
      },
    },
  },
} satisfies Input;

describe("schema projection", () => {
  it("projects property modifiers, nullable values, annotations, and closed objects", async () => {
    const contents = await schemaContents(projectionInput, "Base");

    expect(contents).toContain("readonly id: string;");
    expect(contents).toContain("note?: string | null;");
    expect(contents).toContain("secret: string;");
    expect(contents).toContain("@writeOnly");
    expect(contents).toContain("bad *\\/ source");
    expect(contents).not.toContain("[key: string]");
  });

  it("projects composition, literals, and tuples", async () => {
    await expect(schemaContents(projectionInput, "Combined")).resolves.toContain("Base & Extra");
    await expect(schemaContents(projectionInput, "Choice")).resolves.toContain(
      '"created" | "processed"',
    );
    await expect(schemaContents(projectionInput, "Tuple")).resolves.toMatch(
      /Tuple = \[\s*string,\s*number\s*\]/u,
    );
  });

  it("retains compatible index values and widens incompatible values", async () => {
    await expect(schemaContents(projectionInput, "StringMap")).resolves.toContain(
      "[key: string]: string;",
    );
    await expect(schemaContents(projectionInput, "MixedMap")).resolves.toContain(
      "[key: string]: unknown;",
    );
  });

  it("widens nested-index candidates that are structurally incompatible", async () => {
    const matrix = {
      asyncapi: "3.1.0",
      info: { title: "Index matrix", version: "1.0.0" },
      components: {
        schemas: {
          Compatible: {
            type: "object",
            properties: {
              fixed: { type: "object", properties: { value: { type: "string" } } },
            },
            additionalProperties: { type: "object", properties: { value: { type: "string" } } },
          },
          IncompatibleNested: {
            type: "object",
            properties: {
              fixed: { type: "object", properties: { value: { type: "string" } } },
            },
            additionalProperties: { type: "object", properties: { value: { type: "number" } } },
          },
          OptionalToRequired: {
            type: "object",
            properties: {
              fixed: { type: "object", properties: { value: { type: "string" } } },
            },
            additionalProperties: {
              type: "object",
              required: ["value"],
              properties: { value: { type: "string" } },
            },
          },
          ArrayCompatible: {
            type: "object",
            properties: {
              fixed: { type: "array", items: { type: "string" } },
            },
            additionalProperties: { type: "array", items: { type: "string" } },
          },
          ArrayIncompatible: {
            type: "object",
            properties: {
              fixed: { type: "array", items: { type: "string" } },
            },
            additionalProperties: { type: "array", items: { type: "number" } },
          },
          TupleIncompatible: {
            type: "object",
            properties: {
              fixed: { type: "array", items: [{ type: "string" }, { type: "number" }] },
            },
            additionalProperties: {
              type: "array",
              items: [{ type: "number" }, { type: "number" }],
            },
          },
          UnionCompatible: {
            type: "object",
            properties: {
              fixed: { type: ["string", "null"] },
            },
            additionalProperties: { type: ["string", "null"] },
          },
          UnionIncompatible: {
            type: "object",
            properties: {
              fixed: { type: ["string", "number"] },
            },
            additionalProperties: { type: "string" },
          },
        },
      },
    } satisfies Input;

    const expectIndex = async (name: string, pattern: RegExp): Promise<void> => {
      const contents = await schemaContents(matrix, name);
      // Anchor to the top-level index signature (two-space indentation) so we
      // distinguish retained object candidates from widened `unknown` values.
      expect(contents).toMatch(pattern);
    };

    await expectIndex("Compatible", /^ {2}\[key: string\]: \{$/mu);
    await expectIndex("IncompatibleNested", /^ {2}\[key: string\]: unknown;$/mu);
    await expectIndex("OptionalToRequired", /^ {2}\[key: string\]: unknown;$/mu);
    await expectIndex("ArrayCompatible", /^ {2}\[key: string\]: string\[\];$/mu);
    await expectIndex("ArrayIncompatible", /^ {2}\[key: string\]: unknown;$/mu);
    await expectIndex("TupleIncompatible", /^ {2}\[key: string\]: unknown;$/mu);
    await expectIndex("UnionCompatible", /^ {2}\[key: string\]: string \| null;$/mu);
    await expectIndex("UnionIncompatible", /^ {2}\[key: string\]: unknown;$/mu);
  });

  it("uses symbolic imports for mutual recursion", async () => {
    const result = await run({ input: projectionInput, plugins: [typescript()] });
    const left = result.artifacts.find((artifact) => artifact.path.endsWith("/Left.ts"));
    const right = result.artifacts.find((artifact) => artifact.path.endsWith("/Right.ts"));

    expect(left?.contents).toContain('import type { Right } from "./Right.js";');
    expect(left?.contents).toContain("right?: Right;");
    expect(right?.contents).toContain('import type { Left } from "./Left.js";');
    expect(right?.contents).toContain("left?: Left;");
  });

  it("emits file-local private aliases for anonymous recursion and compiles it", async () => {
    const input: Input = {
      asyncapi: "3.1.0",
      info: { title: "Recursion", version: "1.0.0" },
      components: {
        schemas: {
          Doc: {
            type: "object",
            properties: {
              meta: { type: "string" },
              root: {
                type: "object",
                properties: {
                  b: {
                    type: "object",
                    properties: { a: { $ref: "#/components/schemas/Doc/properties/root" } },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await run({ input, plugins: [typescript()] });
    const doc = result.artifacts.find((artifact) => artifact.path.endsWith("/schemas/Doc.ts"));
    const barrel = result.artifacts.find((artifact) => artifact.path.endsWith("/index.ts"));

    expect(doc?.contents).toContain("type DocRoot");
    expect(doc?.contents).toContain("type DocRootB");
    // File-local aliases are never exported nor referenced cross-file.
    expect(doc?.contents).not.toContain("export type DocRoot");
    expect(doc?.contents).not.toContain("import type { DocRoot");
    expect(barrel?.contents).not.toContain("DocRoot");
  });

  it("emits private aliases for a message-owned recursive payload in the message file", async () => {
    const input: Input = {
      asyncapi: "3.1.0",
      info: { title: "Message recursion", version: "1.0.0" },
      channels: {
        events: {
          address: "events",
          messages: {
            Ev: {
              payload: {
                type: "object",
                properties: {
                  value: { type: "string" },
                  child: {
                    type: "object",
                    properties: { next: { $ref: "#/channels/events/messages/Ev/payload" } },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await run({ input, plugins: [typescript()] });
    const message = result.artifacts.find((artifact) => artifact.path.includes("/messages/"));
    const barrel = result.artifacts.find((artifact) => artifact.path.endsWith("/index.ts"));

    expect(message?.contents).toContain("type EventsEvPayloadChild");
    expect(message?.contents).not.toContain("export type EventsEvPayloadChild");
    expect(barrel?.contents).not.toContain("EventsEvPayloadChild");
  });

  it("keeps acyclic anonymous wrapping inline without private aliases", async () => {
    const input: Input = {
      asyncapi: "3.1.0",
      info: { title: "Acyclic", version: "1.0.0" },
      components: {
        schemas: {
          Node: {
            type: "object",
            properties: {
              name: { type: "string" },
              child: {
                type: "object",
                properties: { node: { $ref: "#/components/schemas/Node" } },
              },
            },
          },
        },
      },
    };

    const result = await run({ input, plugins: [typescript()] });
    const node = result.artifacts.find((artifact) => artifact.path.endsWith("/schemas/Node.ts"));

    expect(node?.contents).toContain("node?: Node;");
    expect(node?.contents).not.toMatch(/^type Node[A-Z]/mu);
  });
});
