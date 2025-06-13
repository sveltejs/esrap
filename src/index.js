/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Handlers, Indent, Newline, NodeWithComments, PrintOptions } from './types' */
import { encode } from '@jridgewell/sourcemap-codec';
import ts from './languages/ts.js';
import { create_sequence, prepend_comments } from './handlers.js';

/** @type {(str: string) => string} str */
let btoa = () => {
	throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
};

if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
	btoa = (str) => window.btoa(unescape(encodeURIComponent(str)));
	// @ts-expect-error
} else if (typeof Buffer === 'function') {
	// @ts-expect-error
	btoa = (str) => Buffer.from(str, 'utf-8').toString('base64');
}

/** @type {Newline} */
const newline = { type: 'Newline' };

/** @type {Indent} */
const indent = { type: 'Indent' };

/** @type {Dedent} */
const dedent = { type: 'Dedent' };

const grouped_expression_types = [
	'ImportDeclaration',
	'VariableDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration'
];

export class Context {
	#handlers;
	#quote;

	multiline = false;

	/**
	 *
	 * @param {Handlers} handlers
	 * @param {'"' | "'"} quote
	 * @param {Command[]} commands
	 * @param {any[]} comments
	 */
	constructor(handlers, quote, commands = [], comments = []) {
		this.#handlers = handlers;
		this.#quote = quote;
		this.commands = commands;
		this.comments = comments;
	}

	indent() {
		this.commands.push(indent);
	}

	dedent() {
		this.commands.push(dedent);
	}

	newline() {
		this.commands.push(newline);
	}

	/**
	 * @param {Command[]} commands
	 */
	push(...commands) {
		this.commands.push(...commands);
	}

	/**
	 *
	 * @param {string} content
	 * @param {TSESTree.Node} [node]
	 */
	write(content, node) {
		if (node?.loc) {
			// TODO make location extraction pluggable too
			this.location(node.loc.start.line, node.loc.start.column);
			this.commands.push(content);
			this.location(node.loc.end.line, node.loc.end.column);
		} else {
			this.commands.push(content);
		}
	}

	/**
	 *
	 * @param {number} line
	 * @param {number} column
	 */
	location(line, column) {
		this.commands.push({
			type: 'Location',
			line,
			column
		});
	}

	/**
	 *
	 * @param {string} string
	 */
	quote(string) {
		const char = this.#quote;
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

	/**
	 * @param {{ type: string }} node
	 */
	visit(node) {
		const node_with_comments = /** @type {NodeWithComments} */ (node);

		const handler = this.#handlers[node.type];

		if (!handler) {
			let error = [`Failed to find an implementation for ${node.type}`];

			if (node.type.includes('JSX')) {
				error.push(`hint: perhaps you need to use 'esrap/languages/jsx'`);
			}
			if (node.type.includes('TS')) {
				error.push(`hint: perhaps you need to use 'esrap/languages/ts'`);
			}
			if (node.type.includes('TSX')) {
				error.push(`hint: perhaps you need to use 'esrap/languages/tsx'`);
			}
			if (Object.keys(this.#handlers).length < 25) {
				error.push(
					`hint: perhaps you added custom handlers, but forgot to use 'esrap/languages/js'`
				);
			}

			throw new Error(error.join('\n'));
		}

		if (node_with_comments.leadingComments) {
			prepend_comments(node_with_comments.leadingComments, this, false);
		}

		handler(node, this);

		if (node_with_comments.trailingComments) {
			this.comments.push(node_with_comments.trailingComments[0]); // there is only ever one
		}
	}

	/**
	 * Push a sequence of nodes, keeping them on one line by default but spreading
	 * onto multiple lines if necessary
	 * @param {Array<{ type: string }>} nodes
	 * @param {boolean} pad
	 */
	inline(nodes, pad, separator = ',') {
		if (nodes.length === 0) return;

		const index = this.commands.length;

		const open = create_sequence();
		const join = create_sequence();
		const close = create_sequence();

		this.commands.push(open);

		const child_state = this.child();

		let prev;

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];
			const is_first = i === 0;
			const is_last = i === nodes.length - 1;

			if (node) {
				if (!is_first && !prev) {
					this.commands.push(join);
				}

				child_state.visit(node);

				if (!is_last) {
					this.commands.push(separator);
				}

				if (this.comments.length > 0) {
					this.commands.push(' ');

					while (this.comments.length) {
						const comment = /** @type {TSESTree.Comment} */ (this.comments.shift());
						this.commands.push({ type: 'Comment', comment });
						if (!is_last) this.commands.push(join);
					}

					child_state.multiline = true;
				} else {
					if (!is_last) this.commands.push(join);
				}
			} else {
				// This is only used for ArrayPattern and ArrayExpression, but
				// it makes more sense to have the logic here than there, because
				// otherwise we'd duplicate a lot more stuff
				this.commands.push(separator);
			}

			prev = node;
		}

		this.commands.push(close);

		const multiline = child_state.multiline || this.measure(this.commands, index) > 50;

		if (multiline) {
			this.multiline = true;

			open.push(indent, newline);
			join.push(newline);
			close.push(dedent, newline);
		} else {
			if (pad) open.push(' ');
			join.push(' ');
			if (pad) close.push(' ');
		}
	}

	/**
	 * Push a sequence of nodes onto separate lines, separating them with
	 * an extra newline where appropriate
	 * @param {Array<{ type: string }>} nodes
	 */
	block(nodes) {
		let last_statement = {
			type: 'EmptyStatement'
		};

		let first = true;
		let needs_margin = false;

		for (const statement of nodes) {
			if (statement.type === 'EmptyStatement') continue;

			const margin = create_sequence();

			if (!first) {
				this.push(margin);
				this.newline();
			}

			first = false;

			const statement_with_comments = /** @type {NodeWithComments} */ (statement);
			const leading_comments = statement_with_comments.leadingComments;
			delete statement_with_comments.leadingComments;

			if (leading_comments && leading_comments.length > 0) {
				prepend_comments(leading_comments, this, true);
			}

			const child_context = this.child();
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

			while (this.comments.length) {
				const comment = /** @type {TSESTree.Comment} */ (this.comments.shift());

				this.commands.push(add_newline ? newline : ' ', { type: 'Comment', comment });
				add_newline = comment.type === 'Line';
			}

			needs_margin = child_context.multiline;
			last_statement = statement;
		}
	}

	/**
	 * @param {Command[]} commands
	 * @param {number} from
	 * @param {number} [to]
	 * @returns
	 */
	measure(commands, from, to = commands.length) {
		let total = 0;
		for (let i = from; i < to; i += 1) {
			const command = commands[i];
			if (typeof command === 'string') {
				total += command.length;
			} else if (Array.isArray(command)) {
				total +=
					command.length === 0
						? 2 // assume this is ', '
						: this.measure(command, 0);
			}
		}

		return total;
	}

	child() {
		return new Context(this.#handlers, this.#quote, this.commands, this.comments);
	}
}

/**
 * @param {{ type: string, [key: string]: any }} node
 * @param {PrintOptions} opts
 * @returns {{ code: string, map: any }} // TODO
 */
export function print(node, opts = {}) {
	if (Array.isArray(node)) {
		return print(
			{
				type: 'Program',
				body: node,
				sourceType: 'module'
			},
			opts
		);
	}

	const context = new Context(
		opts.handlers ?? /** @type {Handlers} */ (ts),
		opts.quotes === 'double' ? '"' : "'"
	);

	context.visit(node);

	/** @typedef {[number, number, number, number]} Segment */

	let code = '';
	let current_column = 0;

	/** @type {Segment[][]} */
	let mappings = [];

	/** @type {Segment[]} */
	let current_line = [];

	/** @param {string} str */
	function append(str) {
		code += str;

		for (let i = 0; i < str.length; i += 1) {
			if (str[i] === '\n') {
				mappings.push(current_line);
				current_line = [];
				current_column = 0;
			} else {
				current_column += 1;
			}
		}
	}

	let newline = '\n';
	const indent = opts.indent ?? '\t';

	/** @param {Command} command */
	function run(command) {
		if (typeof command === 'string') {
			append(command);
			return;
		}

		if (Array.isArray(command)) {
			for (let i = 0; i < command.length; i += 1) {
				run(command[i]);
			}
			return;
		}

		switch (command.type) {
			case 'Location':
				current_line.push([
					current_column,
					0, // source index is always zero
					command.line - 1,
					command.column
				]);
				break;

			case 'Newline':
				append(newline);
				break;

			case 'Indent':
				newline += indent;
				break;

			case 'Dedent':
				newline = newline.slice(0, -indent.length);
				break;

			case 'Comment':
				if (command.comment.type === 'Line') {
					append(`//${command.comment.value}`);
				} else {
					append(`/*${command.comment.value.replace(/\n/g, newline)}*/`);
				}

				break;
		}
	}

	for (let i = 0; i < context.commands.length; i += 1) {
		run(context.commands[i]);
	}

	mappings.push(current_line);

	const map = {
		version: 3,
		/** @type {string[]} */
		names: [],
		sources: [opts.sourceMapSource || null],
		sourcesContent: [opts.sourceMapContent || null],
		mappings:
			opts.sourceMapEncodeMappings == undefined || opts.sourceMapEncodeMappings
				? encode(mappings)
				: mappings
	};

	Object.defineProperties(map, {
		toString: {
			enumerable: false,
			value: function toString() {
				return JSON.stringify(this);
			}
		},
		toUrl: {
			enumerable: false,
			value: function toUrl() {
				return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
			}
		}
	});

	return {
		code,
		map
	};
}
