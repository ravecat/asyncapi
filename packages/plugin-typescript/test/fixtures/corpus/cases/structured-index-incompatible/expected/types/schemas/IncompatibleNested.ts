export type IncompatibleNested = {
  fixed?: {
    value?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
