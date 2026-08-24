import type { Input } from "../../src/index.js";

// Reusable raw-input fixtures and expected interaction summaries for the #14 and
// #17 acceptance corrections. These stay in Core so plugin tests do not import
// plugin fixtures and vice versa.

export interface OperationIdentityCase {
  readonly input: Input;
  readonly identities: readonly string[];
  readonly names: readonly string[];
  readonly pointers: readonly string[];
}

// #14: two AsyncAPI 2.6 channels publish without operationId, plus an authored id,
// plus special `/` and `~` channel keys, and one subscribe.
export const operationIdentitySameRole = (): Input => ({
  asyncapi: "2.6.0",
  info: { title: "Same role", version: "1.0.0" },
  channels: {
    first: { publish: { message: { name: "First", payload: { type: "string" } } } },
    second: { publish: { message: { name: "Second", payload: { type: "string" } } } },
  },
});

export const operationIdentityMixed = (): Input => ({
  asyncapi: "2.6.0",
  info: { title: "Mixed", version: "1.0.0" },
  channels: {
    "users/{userId}": {
      subscribe: { message: { name: "UserEvent", payload: { type: "string" } } },
    },
    "a/b": { publish: { message: { name: "SlashEvent", payload: { type: "number" } } } },
    "c~d": {
      publish: {
        operationId: "authoredOp",
        message: { name: "TildeEvent", payload: { type: "boolean" } },
      },
    },
  },
});

export const operationIdentitySameRoleExpected: OperationIdentityCase = {
  input: operationIdentitySameRole(),
  identities: ["operation:channel:first:publish", "operation:channel:second:publish"],
  names: ["first-publish", "second-publish"],
  pointers: ["/channels/first/publish", "/channels/second/publish"],
};

export const operationIdentityMixedExpected: OperationIdentityCase = {
  input: operationIdentityMixed(),
  identities: [
    "operation:authoredOp",
    "operation:channel:a/b:publish",
    "operation:channel:users/{userId}:subscribe",
  ],
  names: ["authoredOp", "a/b-publish", "users/{userId}-subscribe"],
  pointers: [
    "/channels/c~0d/publish",
    "/channels/a~1b/publish",
    "/channels/users~1{userId}/subscribe",
  ],
};

export interface ContractErrorExpectation {
  readonly code: "INTERACTION_REFERENCE_UNSUPPORTED" | "INTERACTION_VERSION_UNSUPPORTED";
  readonly pointer: string;
  readonly details: Readonly<Record<string, string>>;
}

// #17: a channel message payload resolved from an external memory reference.
export const externalReferenceInput = (): Input => ({
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
});

export const externalReferenceExpected: ContractErrorExpectation = {
  code: "INTERACTION_REFERENCE_UNSUPPORTED",
  pointer: "/channels/events/messages/Event/payload",
  details: { referenceKind: "schema", reference: "memory://schemas/Payload" },
};

// #17 control: the same location defined inline (no external $ref) must succeed.
export const externalReferenceInlineInput = (): Input => ({
  asyncapi: "3.1.0",
  info: { title: "Inline", version: "1.0.0" },
  channels: {
    events: {
      address: "events",
      messages: { Event: { payload: { type: "object", properties: { id: { type: "string" } } } } },
    },
  },
  operations: {
    sendEvent: {
      action: "send",
      channel: { $ref: "#/channels/events" },
      messages: [{ $ref: "#/channels/events/messages/Event" }],
    },
  },
});
