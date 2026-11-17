// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

test.each([
	['obj?.a.b', 'object', 'js'],
	['obj?.m()', 'callee', 'js'],
	['obj?.a.b()', 'callee', 'js'],
	['obj?.m().a', 'object', 'js'],
	['obj.m?.().a', 'object', 'js'],
	['obj?.a!.b', 'object', 'ts'],
	['obj?.a!.b', 'object.expression', 'ts'],
	['obj?.a!()', 'callee', 'ts'],
	['obj?.m<string>', 'expression', 'ts']
])('a re-anchored @type on %s (%s) does not split the chain', (expression, path, fileExtension) => {
	const { ast } = acornParse(`const result = ${expression};`, { fileExtension });
	const chain = /** @type {any} */ (ast.body[0]).declarations[0].init;
	let target = chain.expression;
	for (const key of path.split('.')) target = target[key];

	// Transforms can re-anchor comments between the chain's start and an inner
	// node's synthetic start, so the inner visitor (not ChainExpression) sees it.
	const { line, column } = target.loc.start;
	target.loc = { start: { line, column: column + 2 }, end: target.loc.end };
	const comment = {
		type: /** @type {const} */ ('Block'),
		value: '* @type {any} ',
		loc: { start: { line, column: column + 1 }, end: { line, column: column + 1 } }
	};
	const { code } = print(ast, ts({ comments: [comment] }));

	expect(code).toContain('/** @type {any} */');
	expect(code).not.toContain('*/ (');
	expect(() => acornParse(code, { fileExtension })).not.toThrow();
	if (fileExtension === 'js') {
		const obj = expression.startsWith('obj?.') ? null : {};
		expect(new Function('obj', `${code}\nreturn result;`)(obj)).toBeUndefined();
	}
});

test('a re-anchored @type on super does not parenthesize the bare keyword', () => {
	const { ast } = acornParse('class C extends B { constructor() { super(); } }');
	const target = /** @type {any} */ (ast.body[0]).body.body[0].value.body.body[0].expression.callee;
	const { line, column } = target.loc.start;
	target.loc = { start: { line, column: column + 2 }, end: target.loc.end };
	const { code } = print(
		ast,
		ts({
			comments: [
				{
					type: 'Block',
					value: '* @type {any} ',
					loc: { start: { line, column: column + 1 }, end: { line, column: column + 1 } }
				}
			]
		})
	);

	expect(code).toContain('/** @type {any} */ super()');
	expect(() => acornParse(code)).not.toThrow();
});
