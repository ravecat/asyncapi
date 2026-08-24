import { describe, expect, it } from "vitest";
import {
  InteractionContractError,
  PluginExecutionError,
  run,
  type InteractionContract,
} from "../src/index.js";
import {
  externalReferenceExpected,
  externalReferenceInlineInput,
  externalReferenceInput,
  operationIdentityMixedExpected,
  operationIdentitySameRoleExpected,
} from "./fixtures/interaction-cases.js";

async function captureInteraction(
  input: Parameters<typeof run>[0]["input"],
): Promise<InteractionContract> {
  let interaction: InteractionContract | undefined;
  await run({
    input,
    plugins: [
      {
        name: "capture",
        generate(context) {
          interaction = context.interaction;
          return [];
        },
      },
    ],
  });
  if (interaction === undefined) {
    throw new Error("Expected the plugin to capture the interaction contract.");
  }
  return interaction;
}

describe("issue #14 operation identity matrix", () => {
  it("derives distinct same-role identities for two AsyncAPI 2.6 publish channels", async () => {
    const interaction = await captureInteraction(operationIdentitySameRoleExpected.input);
    expect(interaction.operations.map((operation) => operation.identity)).toEqual(
      operationIdentitySameRoleExpected.identities,
    );
    expect(interaction.operations.map((operation) => operation.name)).toEqual(
      operationIdentitySameRoleExpected.names,
    );
    expect(interaction.operations.map((operation) => operation.pointer)).toEqual(
      operationIdentitySameRoleExpected.pointers,
    );
    expect(interaction.operations.map((operation) => operation.action)).toEqual(["send", "send"]);
  });

  it("keeps authored IDs authoritative while deriving the rest in a mixed document", async () => {
    const interaction = await captureInteraction(operationIdentityMixedExpected.input);
    expect(interaction.operations.map((operation) => operation.identity)).toEqual([
      "operation:authoredOp",
      "operation:channel:a/b:publish",
      "operation:channel:users/{userId}:subscribe",
    ]);
    const authored = interaction.operations.find(
      (operation) => operation.identity === "operation:authoredOp",
    );
    expect(authored).toMatchObject({
      name: "authoredOp",
      pointer: "/channels/c~0d/publish",
      action: "send",
    });
  });

  it("retains AsyncAPI 3.0 operation-map identities unchanged", async () => {
    const interaction = await captureInteraction({
      asyncapi: "3.0.0",
      info: { title: "3.0", version: "1.0.0" },
      channels: {
        events: { address: "events", messages: { ev: { payload: { type: "string" } } } },
      },
      operations: {
        sendEvent: {
          action: "send",
          channel: { $ref: "#/channels/events" },
          messages: [{ $ref: "#/channels/events/messages/ev" }],
        },
      },
    });
    expect(interaction.operations[0]).toMatchObject({
      identity: "operation:sendEvent",
      name: "sendEvent",
    });
  });
});

describe("issue #17 external reference identity matrix", () => {
  it("rejects a provable external anonymous target without additional resolution", async () => {
    const reads: string[] = [];
    const rejection = await run({
      input: externalReferenceInput(),
      parser: {
        parse: { source: "memory://doc" },
        parser: {
          __unstable: {
            resolver: {
              resolvers: [
                {
                  schema: "memory",
                  order: 1,
                  read(uri: { toString(): string }) {
                    reads.push(uri.toString());
                    return JSON.stringify({
                      type: "object",
                      properties: { id: { type: "string" } },
                    });
                  },
                },
              ],
            },
          },
        },
      },
      plugins: [
        {
          name: "consumer",
          generate(context) {
            void context.interaction;
            return [];
          },
        },
      ],
    }).catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(PluginExecutionError);
    if (!(rejection instanceof PluginExecutionError)) {
      throw new Error("Expected PluginExecutionError.");
    }
    expect(rejection.pluginName).toBe("consumer");
    expect(rejection.cause).toBeInstanceOf(InteractionContractError);
    expect(rejection.cause).toMatchObject({
      code: externalReferenceExpected.code,
      pointer: externalReferenceExpected.pointer,
    });
    expect((rejection.cause as InteractionContractError).details).toEqual(
      externalReferenceExpected.details,
    );
    expect(reads).toEqual(["memory://schemas/Payload"]);
  });

  it("builds an ordinary inline anonymous schema without a false reference edge", async () => {
    const interaction = await captureInteraction(externalReferenceInlineInput());
    expect(interaction.operations[0]?.messageIdentities.length).toBeGreaterThan(0);
  });
});
