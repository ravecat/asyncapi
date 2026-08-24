export type OptionalToRequired = {
  fixed?: {
    value?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
