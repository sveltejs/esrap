const identity = <T,>(value: T): T => value;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];
const element = <div>{identity('x')}</div>;