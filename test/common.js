// @ts-check

import * as acorn from 'acorn';
import { tsPlugin } from '@sveltejs/acorn-typescript';
import { parseSync } from 'oxc-parser';

/** @import { TSESTree } from '@typescript-eslint/types' */

export const acornTs = acorn.Parser.extend(tsPlugin());
export const acornTsx = acorn.Parser.extend(tsPlugin({ jsx: true }));

/** @param {string} input
 * @param {{ jsxMode?: boolean, sourceType?: 'module' | 'script' }} opts
 */
export function acornParse(input, opts = {}) {
	const jsx = opts.jsxMode ?? false;
	const sourceType = opts.sourceType ?? 'module';
	/** @type {any[]} */
	const comments = [];

	const ast = (jsx ? acornTsx : acornTs).parse(input, {
		ecmaVersion: 'latest',
		sourceType,
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
export function oxcParse(input, opts = { fileExtension: 'ts' }) {
	let { program: ast, comments } = parseSync(`input.${opts.fileExtension}`, input, {
		// loc: true
	});

	return {
		ast: /** @type {TSESTree.Program} */ (/** @type {any} */ (ast)),
		comments: /** @type {TSESTree.Comment[]} */ (/** @type {any} */ (comments))
	};
}
