export const atproto = (o?: { A?: string }) => {};

function f(a?: number) {}

const g = (a?: number) => a;

class C {
	m(a?: number) {}
}

interface I { m(a?: number): void }

type F = (a?: number) => void;