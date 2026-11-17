declare function optionalArray([x]?: number[]): void;
declare function optionalObject({ x }?: { x: number }): void;

type OptionalArray = ([x]?: number[]) => void;
type OptionalObject = ({ x }?: { x: number }) => void;

declare function requiredArray([x]: number[]): void;
declare function requiredObject({ x }: { x: number }): void;
declare function optionalIdentifier(x?: number): void;