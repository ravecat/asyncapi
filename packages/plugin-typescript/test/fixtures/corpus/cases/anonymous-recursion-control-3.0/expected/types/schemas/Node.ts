export type Node = {
  child?: {
    node?: Node;
    [key: string]: unknown;
  };
  name?: string;
  [key: string]: unknown;
};
