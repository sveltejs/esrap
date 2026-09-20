const identity = <T,>(value: T): T => value;
const pair = <T, U>(a: T, b: U): [T, U] => [a, b];
const constant = <const T,>(value: T) => value;
const nested = <T,>(value: T) => <U,>(other: U) => [value, other];
const apply = <T,>(fn: <U,>(value: U) => U, value: T) => fn(value);

function declared<T,>(value: T): T {
	return value;
}

class Box<T,> {}

interface Result<T,> { value: T }

type Identity = <T,>(value: T) => T;

const element = <div>{identity('x')}</div>;
const component = <Component<string> value={identity('x')} />;