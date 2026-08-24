import { describe, expect, it } from "vitest";
import {
  InteractionContractError,
  PluginExecutionError,
  run,
  type Input,
  type InteractionContract,
} from "../src/index.js";

const asyncapi31: Input = {
  asyncapi: "3.1.0",
  info: { title: "Interaction contract", version: "1.0.0" },
  channels: {
    users: {
      address: "users/{userId}",
      parameters: {
        userId: { location: "$message.payload#/id" },
      },
      messages: {
        created: { $ref: "#/components/messages/UserCreated" },
      },
    },
    replies: {
      address: "replies",
      messages: {
        accepted: { payload: { type: "boolean" } },
      },
    },
  },
  operations: {
    sendUser: {
      action: "send",
      channel: { $ref: "#/channels/users" },
      messages: [{ $ref: "#/channels/users/messages/created" }],
      reply: { channel: { $ref: "#/channels/replies" } },
    },
  },
  components: {
    messages: {
      UserCreated: {
        name: "user-created",
        headers: {
          type: "object",
          properties: { traceId: { type: "string" } },
        },
        payload: { $ref: "#/components/schemas/User" },
      },
    },
    schemas: {
      User: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
          friend: { $ref: "#/components/schemas/User" },
        },
      },
      Unused: { type: "integer" },
    },
  },
};

const asyncapi26: Input = {
  asyncapi: "2.6.0",
  info: { title: "Interaction contract", version: "1.0.0" },
  channels: {
    "users/{userId}": {
      parameters: { userId: { schema: { type: "string" } } },
      publish: {
        operationId: "publishUser",
        message: { $ref: "#/components/messages/UserCreated" },
      },
    },
  },
  components: {
    messages: {
      UserCreated: { payload: { $ref: "#/components/schemas/User" } },
    },
    schemas: {
      User: { type: "object", properties: { id: { type: "string" } } },
    },
  },
};

function captureInteraction(input: Input): Promise<InteractionContract> {
  let interaction: InteractionContract | undefined;
  return run({
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
  }).then(() => {
    if (interaction === undefined) {
      throw new Error("Expected the plugin to capture the interaction contract.");
    }
    return interaction;
  });
}

describe("PluginContext.interaction", () => {
  it("normalizes AsyncAPI 3.1 roots, selections, replies, and dependencies", async () => {
    const interaction = await captureInteraction(asyncapi31);

    expect(interaction.asyncapiVersion).toBe("3.1.0");
    expect(interaction.schemas.map((schema) => schema.identity)).toEqual([
      "schema:component:Unused",
      "schema:component:User",
    ]);
    expect(interaction.messages.map((message) => message.identity)).toEqual([
      "message:channel:replies:/channels/replies/messages/accepted",
      "message:component:UserCreated",
    ]);
    expect(interaction.channels.map((channel) => channel.identity)).toEqual([
      "channel:replies",
      "channel:users",
    ]);
    expect(interaction.operations).toMatchObject([
      {
        identity: "operation:sendUser",
        action: "send",
        channelIdentity: "channel:users",
        messageIdentities: ["message:component:UserCreated"],
        replyIdentity: "reply:operation:sendUser",
      },
    ]);
    expect(interaction.replies).toMatchObject([
      {
        identity: "reply:operation:sendUser",
        channelIdentity: "channel:replies",
        messageIdentities: ["message:channel:replies:/channels/replies/messages/accepted"],
      },
    ]);
    expect(interaction.schemas.find((schema) => schema.name === "User")?.dependencies).toEqual([
      {
        targetIdentity: "schema:component:User",
        pointer: "/components/schemas/User/properties/friend",
      },
    ]);
  });

  it("normalizes AsyncAPI 2.6 publish operations to send", async () => {
    const interaction = await captureInteraction(asyncapi26);

    expect(interaction.asyncapiVersion).toBe("2.6.0");
    expect(interaction.operations).toMatchObject([
      {
        identity: "operation:publishUser",
        action: "send",
        channelIdentity: "channel:users/{userId}",
        messageIdentities: ["message:component:UserCreated"],
      },
    ]);
    expect(interaction.replies).toEqual([]);
  });

  it("derives collision-free AsyncAPI 2.6 identities for same-role channels without operationId", async () => {
    const interaction = await captureInteraction({
      asyncapi: "2.6.0",
      info: { title: "Same role", version: "1.0.0" },
      channels: {
        first: { publish: { message: { payload: { type: "string" } } } },
        second: { publish: { message: { payload: { type: "string" } } } },
        "a/b": { subscribe: { message: { payload: { type: "number" } } } },
        "c~d": {
          subscribe: { operationId: "authoredOp", message: { payload: { type: "boolean" } } },
        },
      },
    });

    // Distinct derived identities for same-role channels; authored operationId
    // stays authoritative.
    expect(interaction.operations.map((operation) => operation.identity)).toEqual([
      "operation:authoredOp",
      "operation:channel:a/b:subscribe",
      "operation:channel:first:publish",
      "operation:channel:second:publish",
    ]);
    expect(interaction.operations.map((operation) => operation.name)).toEqual([
      "authoredOp",
      "a/b-subscribe",
      "first-publish",
      "second-publish",
    ]);
    expect(interaction.operations).toContainEqual(
      expect.objectContaining({
        identity: "operation:authoredOp",
        name: "authoredOp",
        action: "receive",
        pointer: "/channels/c~0d/subscribe",
      }),
    );
    expect(interaction.operations).toContainEqual(
      expect.objectContaining({
        identity: "operation:channel:first:publish",
        name: "first-publish",
        action: "send",
        pointer: "/channels/first/publish",
      }),
    );
    expect(interaction.operations).toContainEqual(
      expect.objectContaining({
        identity: "operation:channel:a/b:subscribe",
        name: "a/b-subscribe",
        action: "receive",
        pointer: "/channels/a~1b/subscribe",
      }),
    );
  });

  it("normalizes AsyncAPI 3.0 with the same contract shape", async () => {
    const interaction = await captureInteraction({
      ...asyncapi31,
      asyncapi: "3.0.0",
    });

    expect(interaction.asyncapiVersion).toBe("3.0.0");
    expect(interaction.operations[0]).toMatchObject({
      identity: "operation:sendUser",
      action: "send",
      replyIdentity: "reply:operation:sendUser",
    });
  });

  it("uses parser-effective message and operation traits", async () => {
    const interaction = await captureInteraction({
      asyncapi: "3.1.0",
      info: { title: "Effective traits", version: "1.0.0" },
      channels: {
        events: {
          address: "events",
          messages: { event: { $ref: "#/components/messages/Event" } },
        },
      },
      operations: {
        sendEvent: {
          action: "send",
          channel: { $ref: "#/channels/events" },
          traits: [{ $ref: "#/components/operationTraits/Described" }],
        },
      },
      components: {
        messages: {
          Event: {
            traits: [{ $ref: "#/components/messageTraits/Traced" }],
            payload: { type: "string" },
          },
        },
        messageTraits: {
          Traced: {
            headers: {
              type: "object",
              required: ["traceId"],
              properties: { traceId: { type: "string" } },
            },
          },
        },
        operationTraits: {
          Described: { summary: "Trait summary" },
        },
      },
    });

    expect(
      interaction.messages.find((message) => message.identity === "message:component:Event"),
    ).toMatchObject({
      headers: { pointer: "/components/messages/Event/headers" },
    });
    expect(
      interaction.messages.find(
        (message) => message.identity === "message:channel:events:/channels/events/messages/event",
      ),
    ).toMatchObject({
      ownerIdentity: "channel:events",
      headers: { pointer: "/channels/events/messages/event/headers" },
    });
    expect(interaction.operations).toMatchObject([
      {
        identity: "operation:sendEvent",
        summary: "Trait summary",
        messageIdentities: ["message:channel:events:/channels/events/messages/event"],
      },
    ]);
  });

  it("retains parser-supported foreign schema formats without converting them", async () => {
    let interaction: InteractionContract | undefined;
    const schemaFormat = "application/vnd.apache.avro+json;version=1.11.0";
    await run({
      input: {
        asyncapi: "3.1.0",
        info: { title: "Foreign schema", version: "1.0.0" },
        components: {
          schemas: {
            Event: {
              schemaFormat,
              schema: { type: "record", name: "Event", fields: [] },
            },
          },
        },
      },
      parser: {
        parser: {
          schemaParsers: [
            {
              getMimeTypes() {
                return [schemaFormat];
              },
              validate() {},
              parse() {
                return { type: "object" };
              },
            },
          ],
        },
      },
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

    expect(interaction?.schemas[0]).toMatchObject({
      identity: "schema:component:Event",
      schemaFormat,
    });
  });

  it("fail-closes provable external reference targets without additional resolution", async () => {
    const reads: string[] = [];
    const parserOptions = {
      __unstable: {
        resolver: {
          resolvers: [
            {
              schema: "memory",
              order: 1,
              read(uri: { toString(): string }) {
                reads.push(uri.toString());
                return JSON.stringify({ type: "object", properties: { id: { type: "string" } } });
              },
            },
          ],
        },
      },
    };
    const input: Input = {
      asyncapi: "3.1.0",
      info: { title: "External", version: "1.0.0" },
      channels: {
        events: {
          address: "events",
          messages: { Event: { payload: { $ref: "memory://schemas/Payload" } } },
        },
      },
      operations: {
        sendEvent: {
          action: "send",
          channel: { $ref: "#/channels/events" },
          messages: [{ $ref: "#/channels/events/messages/Event" }],
        },
      },
    };

    const rejection = await run({
      input,
      parser: { parse: { source: "memory://doc" }, parser: parserOptions },
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
    const cause = rejection.cause as InteractionContractError;
    expect(cause).toMatchObject({
      code: "INTERACTION_REFERENCE_UNSUPPORTED",
      pointer: "/channels/events/messages/Event/payload",
    });
    expect(cause.details).toEqual({
      referenceKind: "schema",
      reference: "memory://schemas/Payload",
    });
    // The resolver is read only by the initial parse; interaction construction adds none.
    expect(reads).toEqual(["memory://schemas/Payload"]);
  });

  it("keeps local component and inline anonymous references without false rejection", async () => {
    const input: Input = {
      asyncapi: "3.1.0",
      info: { title: "Local", version: "1.0.0" },
      components: { schemas: { User: { type: "object", properties: { id: { type: "string" } } } } },
      channels: {
        events: {
          address: "events",
          messages: {
            Local: { payload: { $ref: "#/components/schemas/User" } },
            Inline: { payload: { type: "string" } },
          },
        },
      },
      operations: {
        sendEvent: {
          action: "send",
          channel: { $ref: "#/channels/events" },
          messages: [{ $ref: "#/channels/events/messages/Inline" }],
        },
      },
    };

    const interaction = await captureInteraction(input);
    expect(interaction.schemas.map((schema) => schema.identity)).toEqual(["schema:component:User"]);
  });

  it("produces equal identities and order for equivalent parsed documents", async () => {
    const first = await captureInteraction(asyncapi31);
    const second = await captureInteraction(asyncapi31);
    const summarize = (interaction: InteractionContract) => ({
      version: interaction.asyncapiVersion,
      schemas: interaction.schemas.map(({ identity, pointer, dependencies }) => ({
        identity,
        pointer,
        dependencies,
      })),
      messages: interaction.messages.map(({ identity, pointer }) => ({ identity, pointer })),
      channels: interaction.channels.map(({ identity, pointer }) => ({ identity, pointer })),
      operations: interaction.operations.map(({ identity, pointer }) => ({ identity, pointer })),
      replies: interaction.replies.map(({ identity, pointer }) => ({ identity, pointer })),
    });

    expect(summarize(second)).toEqual(summarize(first));
  });

  it("memoizes one immutable contract for every consuming plugin", async () => {
    const interactions: InteractionContract[] = [];
    await run({
      input: asyncapi31,
      plugins: [
        {
          name: "first",
          generate(context) {
            interactions.push(context.interaction);
            return [];
          },
        },
        {
          name: "second",
          generate(context) {
            interactions.push(context.interaction);
            return [];
          },
        },
      ],
    });

    expect(interactions).toHaveLength(2);
    expect(interactions[0]).toBe(interactions[1]);
    expect(Object.isFrozen(interactions[0])).toBe(true);
    expect(Object.isFrozen(interactions[0]?.schemas)).toBe(true);
    expect(Object.isFrozen(interactions[0]?.operations[0])).toBe(true);
    expect(Reflect.set(interactions[0] ?? {}, "schemas", [])).toBe(false);
  });

  it("does not build the contract when no plugin accesses it", async () => {
    const result = await run({
      input: {
        asyncapi: "2.5.0",
        info: { title: "Legacy", version: "1.0.0" },
        channels: {},
      },
      plugins: [{ name: "document-only", generate: () => [] }],
    });

    expect(result.document.version()).toBe("2.5.0");
  });

  it("attributes lazy construction failures to the consuming plugin", async () => {
    const calls: string[] = [];
    const rejection = await run({
      input: {
        asyncapi: "2.5.0",
        info: { title: "Legacy", version: "1.0.0" },
        channels: {},
      },
      plugins: [
        {
          name: "consumer",
          generate(context) {
            void context.interaction;
            return [];
          },
        },
        {
          name: "later",
          generate() {
            calls.push("later");
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
      code: "INTERACTION_VERSION_UNSUPPORTED",
      pointer: "/asyncapi",
    });
    expect(calls).toEqual([]);
  });

  it("does not freeze parser-owned schema models", async () => {
    let parserSchemaWasFrozen: boolean | undefined;
    let parserSchemaIsFrozen: boolean | undefined;
    await run({
      input: asyncapi31,
      plugins: [
        {
          name: "observer",
          generate(context) {
            const schema = context.document.components().schemas().get("User");
            if (schema === undefined) {
              throw new Error("Expected User schema.");
            }
            parserSchemaWasFrozen = Object.isFrozen(schema);
            void context.interaction;
            parserSchemaIsFrozen = Object.isFrozen(schema);
            return [];
          },
        },
      ],
    });

    expect(parserSchemaIsFrozen).toBe(parserSchemaWasFrozen);
  });

  it("preserves current anonymous inline behavior for source-less pre-parsed documents", async () => {
    const input: Input = {
      asyncapi: "3.1.0",
      info: { title: "Source-less", version: "1.0.0" },
      channels: {
        events: {
          address: "events",
          messages: { Event: { payload: { type: "string" } } },
        },
      },
      operations: {
        sendEvent: {
          action: "send",
          channel: { $ref: "#/channels/events" },
          messages: [{ $ref: "#/channels/events/messages/Event" }],
        },
      },
    };
    // Pass an already-parsed official document so Core has no retained authored
    // snapshot and cannot prove the origin of an anonymous inline schema.
    const { parseAsyncAPI } = await import("../src/parseAsyncAPI.js");
    let interaction: InteractionContract | undefined;
    const sourceLess = await run({
      input: (await parseAsyncAPI(input)).document,
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

    expect(sourceLess.source).toBeUndefined();
    // The contract still builds: an unresolved anonymous inline schema is not
    // blanket-rejected when no authored provenance can prove its origin.
    expect(interaction).toBeDefined();
    expect(interaction?.operations[0]?.messageIdentities.length).toBeGreaterThan(0);
  });
});
