let n: number = 42;
let s: string = 'Hello, TypeScript!';
let b: boolean = true;
let u: unknown = 'whatever';
let un: undefined = undefined;
let o: object = { name: 'Object' };
let bi: bigint = 1234567890123456789012345678901234567890n;
let ne: never;
let sy: symbol = Symbol('unique');
let a: any = { key: 'value' };
let v: () => void = () => {};
let arr: number[] = [1, 2, 3];
let snu: string | null = null;
let nun: number | undefined = undefined;

// TODO: commented because acorn doesn't support type assertions but oxc does
// let ta = <boolean>true;
