/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Handlers, Location, Indent, Newline, NodeWithComments, State, TypeAnnotationNodes } from './types' */

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
 * @param {TSESTree.Node} node
 * @param {State} state
 */
export function handle(node, state) {
	const node_with_comments = /** @type {NodeWithComments} */ (node);

	const handler = state.handlers[node.type];

	if (!handler) {
		let error = [`Failed to find an implementation for ${node.type}`];

		if (node.type.includes('JSX')) {
			error.push(`hint: perhaps you need to import esrap/modules/jsx`);
		}
		if (node.type.includes('TS')) {
			error.push(`hint: perhaps you need to import esrap/modules/ts`);
		}
		if (node.type.includes('TSX')) {
			error.push(`hint: perhaps you need to import esrap/modules/js`);
		}
		if (Object.keys(state.handlers).length < 25) {
			error.push(`hint: perhaps you added custom handlers, but forgot to use esrap/modules/js`);
		}

		throw new Error(error.join('\n'));
	}

	if (node_with_comments.leadingComments) {
		prepend_comments(node_with_comments.leadingComments, state, false);
	}

	//@ts-expect-error Expression produces a union type that is too complex to represent.
	handler(node, state);

	if (node_with_comments.trailingComments) {
		state.comments.push(node_with_comments.trailingComments[0]); // there is only ever one
	}
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
 * @param {State} state
 * @param {boolean} newlines
 */
function prepend_comments(comments, state, newlines) {
	for (const comment of comments) {
		state.commands.push({ type: 'Comment', comment });

		if (newlines || comment.type === 'Line' || /\n/.test(comment.value)) {
			state.commands.push(newline);
		} else {
			state.commands.push(' ');
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
 * @param {State} state
 */
export const handle_body = (nodes, state) => {
	let last_statement = /** @type {TSESTree.Node} */ ({
		type: 'EmptyStatement'
	});
	let first = true;
	let needs_margin = false;

	for (const statement of nodes) {
		if (statement.type === 'EmptyStatement') continue;

		const margin = create_sequence();

		if (!first) state.commands.push(margin, newline);
		first = false;

		const statement_with_comments = /** @type {NodeWithComments} */ (statement);
		const leading_comments = statement_with_comments.leadingComments;
		delete statement_with_comments.leadingComments;

		if (leading_comments && leading_comments.length > 0) {
			prepend_comments(leading_comments, state, true);
		}

		const child_state = { ...state, multiline: false };
		handle(statement, child_state);

		if (
			child_state.multiline ||
			needs_margin ||
			((grouped_expression_types.includes(statement.type) ||
				grouped_expression_types.includes(last_statement.type)) &&
				last_statement.type !== statement.type)
		) {
			margin.push('\n');
		}

		let add_newline = false;

		while (state.comments.length) {
			const comment = /** @type {TSESTree.Comment} */ (state.comments.shift());

			state.commands.push(add_newline ? newline : ' ', { type: 'Comment', comment });
			add_newline = comment.type === 'Line';
		}

		needs_margin = child_state.multiline;
		last_statement = statement;
	}
};

/**
 * @param {TSESTree.VariableDeclaration} node
 * @param {State} state
 */
export const handle_var_declaration = (node, state) => {
	const index = state.commands.length;

	const open = create_sequence();
	const join = create_sequence();
	const child_state = { ...state, multiline: false };

	state.commands.push(`${node.kind} `, open);

	let first = true;

	for (const d of node.declarations) {
		if (!first) state.commands.push(join);
		first = false;

		handle(d, child_state);
	}

	const multiline =
		child_state.multiline || (node.declarations.length > 1 && measure(state.commands, index) > 50);

	if (multiline) {
		state.multiline = true;
		if (node.declarations.length > 1) open.push(indent);
		join.push(',', newline);
		if (node.declarations.length > 1) state.commands.push(dedent);
	} else {
		join.push(', ');
	}
};

/**
 * @template {TSESTree.Node} T
 * @param {Array<T | null>} nodes
 * @param {State} state
 * @param {boolean} spaces
 * @param {(node: T, state: State) => void} fn
 */
export function sequence(nodes, state, spaces, fn, separator = ',') {
	if (nodes.length === 0) return;

	const index = state.commands.length;

	const open = create_sequence();
	const join = create_sequence();
	const close = create_sequence();

	state.commands.push(open);

	const child_state = { ...state, multiline: false };

	let prev;

	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];
		const is_first = i === 0;
		const is_last = i === nodes.length - 1;

		if (node) {
			if (!is_first && !prev) {
				state.commands.push(join);
			}

			fn(node, child_state);

			if (!is_last) {
				state.commands.push(separator);
			}

			if (state.comments.length > 0) {
				state.commands.push(' ');

				while (state.comments.length) {
					const comment = /** @type {TSESTree.Comment} */ (state.comments.shift());
					state.commands.push({ type: 'Comment', comment });
					if (!is_last) state.commands.push(join);
				}

				child_state.multiline = true;
			} else {
				if (!is_last) state.commands.push(join);
			}
		} else {
			// This is only used for ArrayPattern and ArrayExpression, but
			// it makes more sense to have the logic here than there, because
			// otherwise we'd duplicate a lot more stuff
			state.commands.push(separator);
		}

		prev = node;
	}

	state.commands.push(close);

	const multiline = child_state.multiline || measure(state.commands, index) > 50;

	if (multiline) {
		state.multiline = true;

		open.push(indent, newline);
		join.push(newline);
		close.push(dedent, newline);
	} else {
		if (spaces) open.push(' ');
		join.push(' ');
		if (spaces) close.push(' ');
	}
}
