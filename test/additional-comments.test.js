// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { AdditionalComment } from '../src/languages/types.js' */
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import { acornParse } from './common.js';
import ts from '../src/languages/ts/index.js';

/**
 * Helper to get return statement from a simple function
 * @param {TSESTree.Program} ast - Parsed AST
 * @returns {TSESTree.Node} The return statement
 */
function get_return_statement(ast) {
	const functionDecl = ast.body[0];
	// @ts-expect-error accessing function body
	const statements = functionDecl.body.body;
	// Find the return statement (could be first or second depending on function structure)
	return statements.find(/** @param {any} stmt */ (stmt) => stmt.type === 'ReturnStatement');
}

test('additional comments are inserted correctly', () => {
	const input = `function example() {
	const x = 1;
	return x;
}`;

	const { ast } = acornParse(input);
	const returnStatement = get_return_statement(ast);
	expect(returnStatement.type).toBe('ReturnStatement');

	/** @type {AdditionalComment[]} */
	const comments = [
		{ value: ' This is a leading comment' },
		{
			type: 'Block',
			value: ' This is a trailing comment ',
			position: 'trailing'
		}
	];

	const { code } = print(
		ast,
		ts({ additionalComments: new WeakMap([[returnStatement, comments]]) })
	);

	expect(code).toContain('// This is a leading comment');
	expect(code).toContain('/* This is a trailing comment */');
});

test('only leading comments are inserted when specified', () => {
	const input = `function test() { return 42; }`;
	const { ast } = acornParse(input);
	const returnStatement = get_return_statement(ast);

	/** @type {AdditionalComment[]} */
	const comments = [{ value: ' Leading only' }];

	const { code } = print(
		ast,
		ts({ additionalComments: new WeakMap([[returnStatement, comments]]) })
	);

	expect(code).toContain('// Leading only');
	expect(code).not.toContain('trailing');
});

test('only trailing comments are inserted when specified', () => {
	const input = `function test() { return 42; }`;
	const { ast } = acornParse(input);
	const returnStatement = get_return_statement(ast);

	/** @type {AdditionalComment[]} */
	const comments = [
		{
			type: 'Block',
			value: ' Trailing only ',
			position: 'trailing'
		}
	];

	const { code } = print(
		ast,
		ts({ additionalComments: new WeakMap([[returnStatement, comments]]) })
	);

	expect(code).toContain('/* Trailing only */');
	expect(code).not.toContain('//');
});

test('additional comments multi-line comments have new line', () => {
	const input = `function example() {
	const x = 1;
	return x;
}`;

	const { ast } = acornParse(input);
	const returnStatement = get_return_statement(ast);
	expect(returnStatement.type).toBe('ReturnStatement');

	/** @type {AdditionalComment[]} */
	const comments = [
		{
			type: 'Block',
			value: '*\n * This is a leading comment\n ',
			position: 'leading'
		}
	];

	const { code } = print(
		ast,
		ts({ additionalComments: new WeakMap([[returnStatement, comments]]) })
	);

	expect(code).toMatchInlineSnapshot(`
		"function example() {
			const x = 1;

			/**
			 * This is a leading comment
			 */
			return x;
		}"
	`);
});

test('comments & additional comments', () => {
	const input = `// existing comment
	function example() {
	const x = 1;
	return x;
}`;

	const { ast, comments } = acornParse(input);
	const returnStatement = get_return_statement(ast);
	expect(returnStatement.type).toBe('ReturnStatement');

	/** @type {WeakMap<TSESTree.Node, AdditionalComment[]>} */
	const additionalComments = new WeakMap([
		[returnStatement, [{ value: 'This is a leading comment' }]]
	]);

	const { code } = print(ast, ts({ comments, additionalComments }));

	expect(code).toMatchInlineSnapshot(`
		"// existing comment
		function example() {
			const x = 1;

			//This is a leading comment
			return x;
		}"
	`);
});
