/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Visitors, Indent, Newline, NodeWithComments } from './types' */

import { comments, push_comment } from './languages/js.js';

/** @type {Newline} */
const newline = { type: 'Newline' };

/** @type {Indent} */
const indent = { type: 'Indent' };

/** @type {Dedent} */
const dedent = { type: 'Dedent' };

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

	newline() {
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
		this.#commands.push({
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

		const join = this.new();

		const child_context = this.new();

		let prev;

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];
			const is_first = i === 0;
			const is_last = i === nodes.length - 1;

			if (node) {
				if (!is_first && !prev) {
					child_context.append(join);
				}

				child_context.visit(node);

				if (!is_last) {
					child_context.write(separator);
				}

				// TODO handle comments in a callback
				if (comments.length > 0) {
					child_context.write(' ');

					while (comments.length) {
						const comment = /** @type {TSESTree.Comment} */ (comments.shift());

						push_comment(comment, child_context);

						if (!is_last) {
							if (comment.type === 'Line') {
								child_context.newline();
							} else {
								child_context.append(join);
							}
						}
					}

					child_context.multiline = true;
				} else {
					if (!is_last) child_context.append(join);
				}
			} else {
				// This is only used for ArrayPattern and ArrayExpression, but
				// it makes more sense to have the logic here than there, because
				// otherwise we'd duplicate a lot more stuff
				child_context.write(separator);
			}

			prev = node;
		}

		const length = child_context.measure();

		if (child_context.multiline || length > 50) {
			this.multiline = true;

			join.newline();

			this.indent();
			this.newline();
			this.append(child_context);
			this.dedent();
			this.newline();
		} else {
			join.write(' ');

			if (pad) this.write(' ');
			this.append(child_context);
			if (pad) this.write(' ');
		}
	}

	/**
	 * Push a sequence of nodes onto separate lines, separating them with
	 * an extra newline where appropriate
	 * @param {Array<{ type: string }>} nodes
	 * @param {(a: { type: string }, b: { type: string }) => boolean} add_margin
	 */
	block(nodes, add_margin = () => false) {
		let last_statement = {
			type: 'EmptyStatement'
		};

		let first = true;
		let needs_margin = false;

		for (const statement of nodes) {
			if (statement.type === 'EmptyStatement') continue;

			/** @type {string[]} */
			const margin = [];

			if (!first) {
				this.#commands.push(margin);
				this.newline();
			}

			first = false;

			const statement_with_comments = /** @type {NodeWithComments} */ (statement);
			const leading_comments = statement_with_comments.leadingComments;
			delete statement_with_comments.leadingComments;

			if (leading_comments) {
				for (const comment of leading_comments) {
					push_comment(comment, this);
					this.newline();
				}
			}

			const child_context = this.new();
			this.append(child_context);

			child_context.visit(statement);

			if (child_context.multiline || needs_margin || add_margin(last_statement, statement)) {
				margin.push('\n');
			}

			let add_newline = false;

			// TODO handle comments in a callback
			while (comments.length) {
				const comment = /** @type {TSESTree.Comment} */ (comments.shift());

				if (add_newline) this.newline();
				else this.write(' ');
				push_comment(comment, this);
				add_newline = comment.type === 'Line';
			}

			needs_margin = child_context.multiline;
			last_statement = statement;
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
