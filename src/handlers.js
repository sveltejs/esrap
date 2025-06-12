/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Location, Indent, Newline, NodeWithComments } from './types' */
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

/**
 * @param {string} string
 * @param {'\'' | '"'} char
 */
export function quote(string, char) {
	let out = char;

	for (const c of string) {
		if (c === '\\') {
			out += '\\\\';
		} else if (c === char) {
			out += '\\' + c;
		} else if (c === '\n') {
			out += '\\n';
		} else if (c === '\r') {
			out += '\\r';
		} else {
			out += c;
		}
	}

	return out + char;
}

/** @param {TSESTree.Node} node */
export function has_call_expression(node) {
	while (node) {
		if (node.type === 'CallExpression') {
			return true;
		} else if (node.type === 'MemberExpression') {
			node = node.object;
		} else {
			return false;
		}
	}
}

const grouped_expression_types = [
	'ImportDeclaration',
	'VariableDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration'
];

/**
 * @param {TSESTree.Node[]} nodes
 * @param {Context} context
 */
export const handle_body = (nodes, context) => {
	let last_statement = /** @type {TSESTree.Node} */ ({
		type: 'EmptyStatement'
	});

	let first = true;
	let needs_margin = false;

	for (const statement of nodes) {
		if (statement.type === 'EmptyStatement') continue;

		const margin = create_sequence();

		if (!first) {
			context.push(margin);
			context.newline();
		}

		first = false;

		const statement_with_comments = /** @type {NodeWithComments} */ (statement);
		const leading_comments = statement_with_comments.leadingComments;
		delete statement_with_comments.leadingComments;

		if (leading_comments && leading_comments.length > 0) {
			prepend_comments(leading_comments, context, true);
		}

		const child_context = context.child();
		child_context.visit(statement);

		if (
			child_context.multiline ||
			needs_margin ||
			((grouped_expression_types.includes(statement.type) ||
				grouped_expression_types.includes(last_statement.type)) &&
				last_statement.type !== statement.type)
		) {
			margin.push('\n');
		}

		let add_newline = false;

		while (context.comments.length) {
			const comment = /** @type {TSESTree.Comment} */ (context.comments.shift());

			context.commands.push(add_newline ? newline : ' ', { type: 'Comment', comment });
			add_newline = comment.type === 'Line';
		}

		needs_margin = child_context.multiline;
		last_statement = statement;
	}
};

/**
 * @param {TSESTree.VariableDeclaration} node
 * @param {Context} context
 */
export const handle_var_declaration = (node, context) => {
	const index = context.commands.length;

	const open = create_sequence();
	const join = create_sequence();
	const child_context = context.child();

	context.push(`${node.kind} `, open);

	let first = true;

	for (const d of node.declarations) {
		if (!first) context.commands.push(join);
		first = false;

		child_context.visit(d);
	}

	const multiline =
		child_context.multiline ||
		(node.declarations.length > 1 && context.measure(context.commands, index) > 50);

	if (multiline) {
		context.multiline = true;
		if (node.declarations.length > 1) open.push(indent);
		join.push(',', newline);
		if (node.declarations.length > 1) context.dedent();
	} else {
		join.push(', ');
	}
};
