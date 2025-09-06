// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { AdditionalComment } from '../src/languages/types.js' */
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import { load } from './common.js';
import ts from '../src/languages/ts/index.js';

/**
 * Helper to create additional comments and print code
 * @param {TSESTree.Program} ast - Parsed AST
 * @param {TSESTree.Node} node - AST node to attach comments to
 * @param {AdditionalComment[]} comments - Comments to attach
 * @returns {string} Generated code
 */
function printWithComments(ast, node, comments) {
	const additionalComments = new WeakMap();
	additionalComments.set(node, comments);

	const output = print(ast, ts({ additionalComments }));
	return output.code;
}

/**
 * Helper to get return statement from a simple function
 * @param {TSESTree.Program} ast - Parsed AST
 * @returns {TSESTree.Node} The return statement
 */
function getReturnStatement(ast) {
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

	const { ast } = load(input);
	const returnStatement = getReturnStatement(ast);
	expect(returnStatement.type).toBe('ReturnStatement');

	/** @type {AdditionalComment[]} */
	const comments = [
		{
			type: 'Line',
			value: ' This is a leading comment',
			position: 'leading'
		},
		{
			type: 'Block',
			value: ' This is a trailing comment ',
			position: 'trailing'
		}
	];

	const code = printWithComments(ast, returnStatement, comments);

	expect(code).toContain('// This is a leading comment');
	expect(code).toContain('/* This is a trailing comment */');
});

test('only leading comments are inserted when specified', () => {
	const input = `function test() { return 42; }`;
	const { ast } = load(input);
	const returnStatement = getReturnStatement(ast);

	/** @type {AdditionalComment[]} */
	const comments = [
		{
			type: 'Line',
			value: ' Leading only',
			position: 'leading'
		}
	];

	const code = printWithComments(ast, returnStatement, comments);

	expect(code).toContain('// Leading only');
	expect(code).not.toContain('trailing');
});

test('only trailing comments are inserted when specified', () => {
	const input = `function test() { return 42; }`;
	const { ast } = load(input);
	const returnStatement = getReturnStatement(ast);

	/** @type {AdditionalComment[]} */
	const comments = [
		{
			type: 'Block',
			value: ' Trailing only ',
			position: 'trailing'
		}
	];

	const code = printWithComments(ast, returnStatement, comments);

	expect(code).toContain('/* Trailing only */');
	expect(code).not.toContain('//');
});
