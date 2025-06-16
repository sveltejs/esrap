// @ts-check

import * as acorn from 'acorn';
import { tsPlugin } from '@sveltejs/acorn-typescript';

/** @import { TSESTree } from '@typescript-eslint/types' */

// @ts-expect-error
export const acornTs = acorn.Parser.extend(tsPlugin({ allowSatisfies: true }));
export const acornTsx = acorn.Parser.extend(tsPlugin({ allowSatisfies: true, jsx: true }));

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
