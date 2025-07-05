export type X = number;

type Y = number;
type Z = number;

export type { Y };
export { type Z };

// TODO: commented because acorn doesn't support export = syntax but oxc does
// declare module 'hello' {
//     export = Y;
// }
export as namespace MyNamespace;

// export type * from './elsewhere';
