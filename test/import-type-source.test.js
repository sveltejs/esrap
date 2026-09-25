// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

test('does not read the deprecated argument alias when source is present', () => {
	const { ast } = acornParse('type T = import("x").Foo<string>;');
	const node = /** @type {any} */ (ast.body[0]).typeAnnotation;
	node.source = node.argument;

	Object.defineProperty(node, 'argument', {
		get() {
			throw new Error('The deprecated alias should not be read when source is present');
		}
	});

	expect(() => print(ast, ts())).not.toThrow();
});
