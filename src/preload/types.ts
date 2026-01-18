import type { routes } from '../main/api.js';

export type Routes = typeof routes;
export type RouteArgs<T> = T extends (a: any, ...args: infer Args) => any
  ? Args
  : never;
export type RouteReturn<T> = T extends (...args: any) => infer ReturnType
  ? Promise<ReturnType>
  : never;
