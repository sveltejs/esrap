// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import { acornParse } from './common.js';
import ts from '../src/languages/ts/index.js';

// Regression test for https://github.com/sveltejs/esrap/issues/181:
// a JSDoc `@type` comment re-anchored to a binding position (function parameter
// with a default value) must not be treated as a type cast — wrapping the
// binding target in parentheses produces invalid JS (`(row) = $.noop`).
test('JSDoc @type comment on a parameter with a default value is not wrapped', () => {
	const input = `const row_template = ($$anchor, row = $.noop) => {
	row;
};`;

	const { ast } = acornParse(input);
	const arrow = /** @type {TSESTree.ArrowFunctionExpression} */ (
		/** @type {any} */ (ast.body[0]).declarations[0].init
	);
	const param = /** @type {TSESTree.AssignmentPattern} */ (arrow.params[1]);

	// svelte re-anchors template comments onto freshly generated AST nodes whose
	// synthetic `loc` starts before the binding identifier itself
	/** @type {any} */ (param).start = /** @type {any} */ (param.left).start - 4;
	param.loc = {
		start: { line: 1, column: /** @type {any} */ (param.left).start - 4 },
		end: /** @type {any} */ (param.loc).end
	};

	const anchor = /** @type {any} */ (param.left).start - 3;
	const comments = [
		{
			type: /** @type {const} */ ('Block'),
			value: '* @type {any} ',
			start: anchor,
			end: anchor,
			loc: { start: { line: 1, column: anchor }, end: { line: 1, column: anchor } }
		}
	];

	const { code } = print(ast, ts({ comments }), {});

	expect(code).toContain('/** @type {any} */ row = $.noop');
	expect(code).not.toContain('(row)');

	// output must be valid JavaScript
	expect(() => new Function(code)).not.toThrow();
});
