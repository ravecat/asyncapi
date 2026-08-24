export type Compatible = {
  fixed?: {
    value?: string;
    [key: string]: unknown;
  };
  [key: string]: {
    value?: string;
    [key: string]: unknown;
  };
};
