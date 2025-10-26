type A = [x: number, y: string];
type B = { a: string; b: number };
type C = 'foo' | 'bar';
type D = C | A | B | 'foobar';
type E = A & B;
type F = C & 'foobar';

// TODO: commented because acorn doesn't support intrinsic but oxc does
// type G = { [a in C]: string };
type H = this;

type I = `Hello, ${keyof C}`;
type J = () => this is string;
type Bird = { legs: 2 };
type Dog = { legs: 4 };
type Wolf = { legs: 4 };
type Animals = Bird | Dog | Wolf;
type HasFourLegs<Animal> = Animal extends { legs: 4 } ? Animal : never;
type FourLegs = HasFourLegs<Animals>;
type T = [('a' | 'b')?];
type CT = new (tpl: TemplateStringsArray, ...args: Array<unknown>) => (replacements: B) => A;
type X = [...number[]];
type TupleWithRest = [number, ...(1 extends 2 ? string[] : number[])];

// TODO: commented because acorn doesn't support intrinsic but oxc does
// type Uppercase<S extends string> = intrinsic;