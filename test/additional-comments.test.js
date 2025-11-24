// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { BaseComment } from '../src/languages/types.js' */
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import { acornParse } from './common.js';
import ts from '../src/languages/ts/index.js';

/**
 * @param {string} value
 * @returns {BaseComment}
 */
function line(value) {
	return { type: 'Line', value };
}

/**
 * @param {string} value
 * @returns {BaseComment}
 */
function block(value) {
	return { type: 'Block', value };
}

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

	const { code } = print(
		ast,
		ts({
			getLeadingComments: (n) =>
				n === returnStatement ? [line(' This is a leading comment')] : undefined,
			getTrailingComments: (n) =>
				n === returnStatement ? [block(' This is a trailing comment ')] : undefined
		})
	);

	expect(code).toContain('// This is a leading comment');
	expect(code).toContain('/* This is a trailing comment */');
});

test('only leading comments are inserted when specified', () => {
	const input = `function test() { return 42; }`;
	const { ast } = acornParse(input);
	const returnStatement = get_return_statement(ast);

	const { code } = print(
		ast,
		ts({
			getLeadingComments: (n) => (n === returnStatement ? [line(' Leading only ')] : undefined)
		})
	);

	expect(code).toContain('// Leading only');
	expect(code).not.toContain('trailing');
});

test('only trailing comments are inserted when specified', () => {
	const input = `function test() { return 42; }`;
	const { ast } = acornParse(input);
	const returnStatement = get_return_statement(ast);

	const { code } = print(
		ast,
		ts({
			getTrailingComments: (n) => (n === returnStatement ? [block(' Trailing only ')] : undefined)
		})
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

	const { code } = print(
		ast,
		ts({
			getLeadingComments: (n) =>
				n === returnStatement ? [block('*\n * This is a leading comment\n ')] : undefined
		})
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
