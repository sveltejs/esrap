// TODO i think these are currently broken in acorn-typescript?
// export type X = number;
// export type * from './elsewhere';
type Y = number;

type Z = number;

export type { Y };
export { type Z };
