const identity = <T>(x: T): T => x;
const pair = <K, V>(key: K, value: V): [K, V] => [key, value];
const noTypeParams = (x: number): number => x + 1;
const onlyTypeParams = <T>(x: T) => x;
const onlyReturnType = (x: number): string => String(x);
const constrained = <T extends string>(x: T): T => x;