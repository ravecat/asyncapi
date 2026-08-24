import type { Input } from "../../src/index.js";

// Reusable raw-input fixtures and expected interaction summaries for the #14
// acceptance correction. These stay in Core so plugin tests do not import
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
