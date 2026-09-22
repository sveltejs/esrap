type F = (a: A /* c1 */) /* c2 */ => /* c3 */ T;

type G = { (a /* c1 */) /* c2 */ };

type H = { m(a /* c1 */) /* c2 */ };

function f(a /* c1 */) /* c2 */ {}

const g = (a /* c1 */) /* c2 */ => a;
