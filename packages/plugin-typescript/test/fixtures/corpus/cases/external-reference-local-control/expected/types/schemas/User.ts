export type User = {
  friend?: User;
  [key: string]: unknown;
};
