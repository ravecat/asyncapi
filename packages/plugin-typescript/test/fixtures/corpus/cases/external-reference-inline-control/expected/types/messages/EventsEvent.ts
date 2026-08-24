export type EventsEventMessage = {
  payload: EventsEventPayload;
};
export type EventsEventPayload = {
  id?: string;
  [key: string]: unknown;
};
