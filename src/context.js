/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Visitors, Indent, Newline, Margin } from './types' */

import { _comments, push_comment } from './languages/js.js';

/** @type {Margin} */
export const margin = { type: 'Margin' };

/** @type {Newline} */
export const newline = { type: 'Newline' };

/** @type {Indent} */
export const indent = { type: 'Indent' };

/** @type {Dedent} */
export const dedent = { type: 'Dedent' };

export class Context {
	#visitors;
	#quote;
	#commands;

	multiline = false;

	/**
	 *
	 * @param {Visitors} visitors
	 * @param {'"' | "'"} quote
	 * @param {Command[]} commands
	 */
	constructor(visitors, quote, commands = []) {
		this.#visitors = visitors;
		this.#quote = quote;
		this.#commands = commands;
	}

	indent() {
		this.#commands.push(indent);
	}

	dedent() {
		this.#commands.push(dedent);
	}

	margin() {
		this.#commands.push(margin);
	}

	newline() {
		this.multiline = true;
		this.#commands.push(newline);
	}

	/**
	 * @param {Context} context
	 */
	append(context) {
		this.#commands.push(context.#commands);
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
			this.#commands.push(content);
			this.location(node.loc.end.line, node.loc.end.column);
		} else {
			this.#commands.push(content);
		}
	}

	/**
	 *
	 * @param {number} line
	 * @param {number} column
	 */
	location(line, column) {
		this.#commands.push({ type: 'Location', line, column });
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
		const visitor = this.#visitors[node.type];

		if (!visitor) {
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
			if (Object.keys(this.#visitors).length < 25) {
				error.push(
					`hint: perhaps you added custom visitors, but forgot to use 'esrap/languages/js'`
				);
			}

			throw new Error(error.join('\n'));
		}

		if (this.#visitors._) {
			this.#visitors._(node, this, (node) => visitor(node, this));
		} else {
			visitor(node, this);
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

		let multiline = false;
		let length = -2;

		/** @type {TSESTree.Comment[]} */
		const trailing_comments = [];

		/** @type {boolean[]} */
		const multiline_nodes = [];

		const children = nodes.map((node, i) => {
			const child = this.new();
			if (node) child.visit(node);

			multiline_nodes[i] = child.multiline;

			if (i < nodes.length - 1 || !node) {
				child.write(separator);
			}

			if (_comments.length) {
				child.write(' ');
				push_comment(_comments[0], child);
				_comments.length = 0;
			}

			length += child.measure() + 2;
			multiline ||= child.multiline;

			return child;
		});

		multiline ||= length > 60;

		if (multiline) {
			this.indent();
			this.newline();
		} else if (pad) {
			this.write(' ');
		}

		/** @type {Context | null} */
		let prev = null;

		for (let i = 0; i < nodes.length; i += 1) {
			const child = children[i];

			if (child === null) {
				// This is only used for ArrayPattern and ArrayExpression, but
				// it makes more sense to have the logic here than there, because
				// otherwise we'd duplicate a lot more stuff
				// this.write(separator);
				continue;
			}

			if (prev !== null) {
				// this.write(separator);

				if (_comments.length > 0) {
					this.write(' ');
					push_comment(_comments[0], this);
					_comments.length = 0;
				}

				if (multiline_nodes[i - 1] || multiline_nodes[i]) {
					this.margin();
				}

				if (nodes[i]) {
					if (multiline) {
						this.newline();
					} else {
						this.write(' ');
					}
				}
			}

			this.append(child);

			prev = child;
		}

		if (multiline) {
			this.dedent();
			this.newline();
		} else if (pad) {
			this.write(' ');
		}

		// const join = this.new();

		// const child_context = this.new();

		// let prev;

		// for (let i = 0; i < nodes.length; i += 1) {
		// 	const node = nodes[i];
		// 	const is_first = i === 0;
		// 	const is_last = i === nodes.length - 1;

		// 	if (node) {
		// 		if (!is_first && !prev) {
		// 			child_context.append(join);
		// 		}

		// 		child_context.visit(node);

		// 		if (!is_last) child_context.write(separator);

		// 		if (_comments.length > 0) {
		// 			child_context.write(' ');
		// 			push_comment(_comments[0], child_context);
		// 			_comments.length = 0;
		// 		}

		// 		if (!is_last) child_context.append(join);
		// 	} else {
		// 		// This is only used for ArrayPattern and ArrayExpression, but
		// 		// it makes more sense to have the logic here than there, because
		// 		// otherwise we'd duplicate a lot more stuff
		// 		child_context.write(separator);
		// 	}

		// 	prev = node;
		// }

		// if (child_context.multiline || length > 50) {
		// 	join.newline();

		// 	this.indent();
		// 	this.newline();
		// 	this.append(child_context);
		// 	this.dedent();
		// 	this.newline();
		// } else {
		// 	join.write(' ');

		// 	if (pad) this.write(' ');
		// 	this.append(child_context);
		// 	if (pad) this.write(' ');
		// }
	}

	/**
	 * Push a sequence of nodes onto separate lines, separating them with
	 * an extra newline where appropriate
	 * @param {Array<{ type: string }>} nodes
	 */
	block(nodes) {
		/** @type {string | null} */
		let prev_type = null;
		let prev_multiline = false;

		for (const node of nodes) {
			if (node.type === 'EmptyStatement') continue;

			const context = this.new();
			context.visit(node);

			if (prev_type !== null) {
				if (context.multiline || prev_multiline || node.type !== prev_type) {
					this.margin();
				}

				this.newline();
			}

			this.append(context);

			prev_type = node.type;
			prev_multiline = context.multiline;
		}
	}

	measure() {
		return measure(this.#commands);
	}

	new() {
		return new Context(this.#visitors, this.#quote);
	}
}

/**
 *
 * @param {Command[]} commands
 * @param {number} [from]
 * @param {number} [to]
 */
function measure(commands, from = 0, to = commands.length) {
	let total = 0;
	for (let i = from; i < to; i += 1) {
		const command = commands[i];
		if (typeof command === 'string') {
			total += command.length;
		} else if (Array.isArray(command)) {
			total += measure(command);
		}
	}

	return total;
}
