/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Indent, Newline, NodeWithComments } from './types' */
/** @import { Context } from './index.js'; */

/** @type {Newline} */
export const newline = { type: 'Newline' };

/** @type {Indent} */
export const indent = { type: 'Indent' };

/** @type {Dedent} */
export const dedent = { type: 'Dedent' };

/**
 * @returns {Command[]}
 */
export function create_sequence() {
	return [];
}
