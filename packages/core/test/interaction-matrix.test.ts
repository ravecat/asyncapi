import { describe, expect, it } from "vitest";
import { run, type InteractionContract } from "../src/index.js";
import {
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
