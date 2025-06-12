/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Location, Indent, Newline, NodeWithComments, State } from './types' */
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
 * Rough estimate of the combined width of a group of commands
 * @param {Command[]} commands
 * @param {number} from
 * @param {number} to
 */
function measure(commands, from, to = commands.length) {
	let total = 0;
	for (let i = from; i < to; i += 1) {
		const command = commands[i];
		if (typeof command === 'string') {
			total += command.length;
		} else if (Array.isArray(command)) {
			total +=
				command.length === 0
					? 2 // assume this is ', '
					: measure(command, 0);
		}
	}

	return total;
}

/**
 * @param {number} line
 * @param {number} column
 * @returns {Location}
 */
export function l(line, column) {
	return {
		type: 'Location',
		line,
		column
	};
}

/**
 * @param {string} content
 * @param {TSESTree.Node} node
 * @returns {string | Command[]}
 */
export function c(content, node) {
	return node.loc
		? [
				l(node.loc.start.line, node.loc.start.column),
				content,
				l(node.loc.end.line, node.loc.end.column)
			]
		: content;
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

const OPERATOR_PRECEDENCE = {
	'||': 2,
	'&&': 3,
	'??': 4,
	'|': 5,
	'^': 6,
	'&': 7,
	'==': 8,
	'!=': 8,
	'===': 8,
	'!==': 8,
	'<': 9,
	'>': 9,
	'<=': 9,
	'>=': 9,
	in: 9,
	instanceof: 9,
	'<<': 10,
	'>>': 10,
	'>>>': 10,
	'+': 11,
	'-': 11,
	'*': 12,
	'%': 12,
	'/': 12,
	'**': 13
};

/** @type {Record<TSESTree.Expression['type'] | 'Super' | 'RestElement', number>} */
export const EXPRESSIONS_PRECEDENCE = {
	JSXFragment: 20,
	JSXElement: 20,
	ArrayPattern: 20,
	ObjectPattern: 20,
	ArrayExpression: 20,
	TaggedTemplateExpression: 20,
	ThisExpression: 20,
	Identifier: 20,
	TemplateLiteral: 20,
	Super: 20,
	SequenceExpression: 20,
	MemberExpression: 19,
	MetaProperty: 19,
	CallExpression: 19,
	ChainExpression: 19,
	ImportExpression: 19,
	NewExpression: 19,
	Literal: 18,
	TSSatisfiesExpression: 18,
	TSInstantiationExpression: 18,
	TSNonNullExpression: 18,
	TSTypeAssertion: 18,
	AwaitExpression: 17,
	ClassExpression: 17,
	FunctionExpression: 17,
	ObjectExpression: 17,
	TSAsExpression: 16,
	UpdateExpression: 16,
	UnaryExpression: 15,
	BinaryExpression: 14,
	LogicalExpression: 13,
	ConditionalExpression: 4,
	ArrowFunctionExpression: 3,
	AssignmentExpression: 3,
	YieldExpression: 2,
	RestElement: 1
};

/**
 *
 * @param {TSESTree.Expression | TSESTree.PrivateIdentifier} node
 * @param {TSESTree.BinaryExpression | TSESTree.LogicalExpression} parent
 * @param {boolean} is_right
 * @returns
 */
export function needs_parens(node, parent, is_right) {
	if (node.type === 'PrivateIdentifier') return false;

	// special case where logical expressions and coalesce expressions cannot be mixed,
	// either of them need to be wrapped with parentheses
	if (
		node.type === 'LogicalExpression' &&
		parent.type === 'LogicalExpression' &&
		((parent.operator === '??' && node.operator !== '??') ||
			(parent.operator !== '??' && node.operator === '??'))
	) {
		return true;
	}

	const precedence = EXPRESSIONS_PRECEDENCE[node.type];
	const parent_precedence = EXPRESSIONS_PRECEDENCE[parent.type];

	if (precedence !== parent_precedence) {
		// Different node types
		return (
			(!is_right && precedence === 15 && parent_precedence === 14 && parent.operator === '**') ||
			precedence < parent_precedence
		);
	}

	if (precedence !== 13 && precedence !== 14) {
		// Not a `LogicalExpression` or `BinaryExpression`
		return false;
	}

	if (
		/** @type {TSESTree.BinaryExpression} */ (node).operator === '**' &&
		parent.operator === '**'
	) {
		// Exponentiation operator has right-to-left associativity
		return !is_right;
	}

	if (is_right) {
		// Parenthesis are used if both operators have the same precedence
		return (
			OPERATOR_PRECEDENCE[/** @type {TSESTree.BinaryExpression} */ (node).operator] <=
			OPERATOR_PRECEDENCE[parent.operator]
		);
	}

	return (
		OPERATOR_PRECEDENCE[/** @type {TSESTree.BinaryExpression} */ (node).operator] <
		OPERATOR_PRECEDENCE[parent.operator]
	);
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
		(node.declarations.length > 1 && measure(context.commands, index) > 50);

	if (multiline) {
		context.multiline = true;
		if (node.declarations.length > 1) open.push(indent);
		join.push(',', newline);
		if (node.declarations.length > 1) context.dedent();
	} else {
		join.push(', ');
	}
};
