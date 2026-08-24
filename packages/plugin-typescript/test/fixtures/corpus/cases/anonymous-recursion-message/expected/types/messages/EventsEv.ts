export type EventsEvMessage = {
  payload: EventsEvPayload;
};
export type EventsEvPayload = {
  child?: {
    next?: EventsEvPayload;
    [key: string]: unknown;
  };
  value?: string;
  [key: string]: unknown;
};
type EventsEvPayloadChild = {
  next?: {
    child?: EventsEvPayloadChild;
    value?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
