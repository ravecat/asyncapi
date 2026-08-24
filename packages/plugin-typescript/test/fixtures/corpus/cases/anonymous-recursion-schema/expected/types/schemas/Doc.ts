export type Doc = {
  meta?: string;
  root?: {
    b?: {
      a?: DocRoot;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
type DocRoot = {
  b?: {
    a?: DocRoot;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
type DocRootB = {
  a?: {
    b?: DocRootB;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
