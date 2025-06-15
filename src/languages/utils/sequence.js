/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Context } from '../../types.js' */

/** @type {TSESTree.Comment[]} */
export let comments = [];

/**
 * @param {TSESTree.Comment} comment
 * @param {Context} context
 */
export function push_comment(comment, context) {
	if (comment.type === 'Line') {
		context.write(`//${comment.value}`);
		context.newline();
	} else {
		context.write('/*');
		const lines = comment.value.split('\n');

		for (let i = 0; i < lines.length; i += 1) {
			if (i > 0) context.newline();
			context.write(lines[i]);
		}

		context.write('*/');
	}
}

/**
 *
 * @param {Context} context
 * @param {TSESTree.Node[]} nodes
 * @param {boolean} pad
 */
export function sequence(context, nodes, pad, separator = ',') {
	if (nodes.length === 0) return;

	let multiline = false;
	let length = -2;

	/** @type {boolean[]} */
	const multiline_nodes = [];

	const children = nodes.map((node, i) => {
		const child = context.new();
		if (node) child.visit(node);

		multiline_nodes[i] = child.multiline;

		if (i < nodes.length - 1 || !node) {
			child.write(separator);
		}

		if (comments.length) {
			child.write(' ');
			push_comment(comments[0], child);
			comments.length = 0;
		}

		length += child.measure() + 1;
		multiline ||= child.multiline;

		return child;
	});

	multiline ||= length > 60;

	if (multiline) {
		context.indent();
		context.newline();
	} else if (pad) {
		context.write(' ');
	}

	/** @type {Context | null} */
	let prev = null;

	for (let i = 0; i < nodes.length; i += 1) {
		const child = children[i];

		if (prev !== null) {
			if (multiline_nodes[i - 1] || multiline_nodes[i]) {
				context.margin();
			}

			if (nodes[i]) {
				if (multiline) {
					context.newline();
				} else {
					context.write(' ');
				}
			}
		}

		context.append(child);

		prev = child;
	}

	if (multiline) {
		context.dedent();
		context.newline();
	} else if (pad) {
		context.write(' ');
	}
}
