// @ts-check

import * as acorn from 'acorn';
import { tsPlugin } from '@sveltejs/acorn-typescript';
import { parseSync } from 'oxc-parser';

/** @import { TSESTree } from '@typescript-eslint/types' */

export const acornTs = acorn.Parser.extend(tsPlugin());
export const acornTsx = acorn.Parser.extend(tsPlugin({ jsx: true }));

/** @param {string} input
 * @param {{ jsx?: boolean }} opts
 */
export function load(input, opts = {}) {
	const jsx = opts.jsx ?? false;
	/** @type {any[]} */
	const comments = [];

	const ast = (jsx ? acornTsx : acornTs).parse(input, {
		ecmaVersion: 'latest',
		sourceType: 'module',
		locations: true,
		onComment: (block, value, start, end, startLoc, endLoc) => {
			if (block && /\n/.test(value)) {
				let a = start;
				while (a > 0 && input[a - 1] !== '\n') a -= 1;

				let b = a;
				while (/[ \t]/.test(input[b])) b += 1;

				const indentation = input.slice(a, b);
				value = value.replace(new RegExp(`^${indentation}`, 'gm'), '');
			}

			comments.push({
				type: block ? 'Block' : 'Line',
				value,
				start,
				end,
				loc: { start: startLoc, end: endLoc }
			});
		}
	});

	return {
		ast: /** @type {TSESTree.Program} */ (/** @type {any} */ (ast)),
		comments
	};
}

/** @param {string} input
 * @param {{ fileExtension?: string }} opts
 */
export function oxcLoad(input, opts = { fileExtension: 'js' }) {
	const { program: ast, comments } = parseSync(`input.${opts.fileExtension}`, input, {
		range: true
	});

	const comments_with_pos = comments.map((comment) => {
		const startPos = getPositionFromOffset(input, comment.start);
		const endPos = getPositionFromOffset(input, comment.end);

		let value = comment.value;
		// Normalize indentation for block comments with newlines (same as acorn)
		if (comment.type === 'Block' && /\n/.test(value)) {
			let a = comment.start;
			while (a > 0 && input[a - 1] !== '\n') a -= 1;

			let b = a;
			while (/[ \t]/.test(input[b])) b += 1;

			const indentation = input.slice(a, b);
			value = value.replace(new RegExp(`^${indentation}`, 'gm'), '');
		}

		return {
			type: comment.type,
			value,
			start: comment.start,
			end: comment.end,
			loc: {
				start: startPos,
				end: endPos
			}
		};
	});

	// Add location information to AST nodes
	addLocationToNode(ast, input);

	return {
		ast: /** @type {TSESTree.Program} */ (/** @type {any} */ (ast)),
		comments: /** @type {TSESTree.Comment[]} */ (/** @type {any} */ (comments_with_pos))
	};
}

/**
 * Add location information to AST nodes using a more efficient approach
 * @param {any} node
 * @param {string} source
 * @param {Set<any>} visited
 */
function addLocationToNode(node, source, visited = new Set()) {
	if (!node || typeof node !== 'object' || visited.has(node)) {
		return;
	}

	visited.add(node);

	// Add loc to current node if it has start/end
	if (node.start !== undefined && node.end !== undefined) {
		node.loc = {
			start: getPositionFromOffset(source, node.start),
			end: getPositionFromOffset(source, node.end)
		};
	}

	// Process specific known properties to avoid circular references
	const propertiesToProcess = [
		'body',
		'expression',
		'callee',
		'object',
		'property',
		'arguments',
		'params',
		'declarations',
		'id',
		'init',
		'key',
		'value',
		'properties',
		'elements',
		'left',
		'right',
		'test',
		'consequent',
		'alternate',
		'argument',
		'specifiers',
		'local',
		'imported',
		'exported',
		'source',
		'moduleRequest',
		'entries',
		'importName',
		'exportName',
		'returnType',
		'typeParameters',
		'typeAnnotation',
		'decorators',
		'members',
		'elementTypes',
		'types',
		'elementType',
		'rest',
		'computed',
		'optional',
		'shorthand',
		'method',
		'kind',
		'definite',
		'declare',
		'generator',
		'async',
		'directive',
		'block',
		'handler',
		'finalizer',
		'cases',
		'discriminant',
		'guards',
		'statements',
		'declaration',
		'specifier'
	];

	for (const prop of propertiesToProcess) {
		if (node[prop] && typeof node[prop] === 'object') {
			if (Array.isArray(node[prop])) {
				node[prop].forEach((item) => addLocationToNode(item, source, visited));
			} else {
				addLocationToNode(node[prop], source, visited);
			}
		}
	}
}

/**
 * Convert byte offset to line/column position
 * @param {string} source
 * @param {number} offset
 * @returns {{ line: number, column: number }}
 */
function getPositionFromOffset(source, offset) {
	let line = 1;
	let column = 0;

	for (let i = 0; i < offset && i < source.length; i++) {
		if (source[i] === '\n') {
			line++;
			column = 0;
		} else {
			column++;
		}
	}

	return { line, column };
}