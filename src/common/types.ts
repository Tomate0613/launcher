export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

export type Keys<T extends Record<string, any> | undefined> =
  T extends Record<infer A, any> ? A : never;

export type KebabToCamel<T extends string> =
  T extends `${infer Head}-${infer Tail}`
    ? `${Head}${Capitalize<KebabToCamel<Tail>>}`
    : T;
