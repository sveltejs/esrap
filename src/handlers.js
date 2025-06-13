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

/**
 * @param {TSESTree.Comment[]} comments
 * @param {Context} context
 * @param {boolean} newlines
 */
export function prepend_comments(comments, context, newlines) {
	for (const comment of comments) {
		context.push({ type: 'Comment', comment });

		if (newlines || comment.type === 'Line' || /\n/.test(comment.value)) {
			context.newline();
		} else {
			context.push(' ');
		}
	}
}
