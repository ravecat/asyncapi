export type Incompatible = {
  fixed?: {
    value?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
