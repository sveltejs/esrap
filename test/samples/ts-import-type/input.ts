import baz = require('baz');

const foo: import('foo/bar') = 123;
const bar: import('foo/bar').baz = 234;

type T = import('x').Foo<string>;
