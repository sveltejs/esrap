// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

test.each(['source', 'argument', 'both'])('prints TSImportType with %s fields', (field) => {
	const source = 'type T = import("x").Foo<string>;';
	const { ast } = acornParse(source);
	const node = /** @type {any} */ (ast.body[0]).typeAnnotation;

	if (field !== 'argument') {
		node.source = node.argument;
		delete node.argument;
	}

	if (field === 'both') {
		Object.defineProperty(node, 'argument', {
			get() {
				throw new Error('The deprecated alias should not be read when source is present');
			}
		});
	}

	expect(print(ast, ts()).code).toBe(source);
});
