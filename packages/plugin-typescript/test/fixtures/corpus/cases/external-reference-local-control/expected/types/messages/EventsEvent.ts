import type { User } from "../schemas/User.js";
export type EventsEventMessage = {
  payload: EventsEventPayload;
};
export type EventsEventPayload = User;
