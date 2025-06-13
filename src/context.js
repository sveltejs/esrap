/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Handlers, Indent, Newline, NodeWithComments } from './types' */

/** @type {Newline} */
const newline = { type: 'Newline' };

/** @type {Indent} */
const indent = { type: 'Indent' };

/** @type {Dedent} */
const dedent = { type: 'Dedent' };

/**
 * @param {TSESTree.Comment} comment
 * @param {Context} context
 */
function push_comment(comment, context) {
	if (comment.type === 'Line') {
		context.write(`//${comment.value}`);
		// context.newline();
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

export class Context {
	#handlers;
	#quote;
	#commands;

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
		this.#commands = commands;

		this.comments = comments;
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
			for (const comment of node_with_comments.leadingComments) {
				push_comment(comment, this);

				if (comment.type === 'Line' || comment.value.includes('\n')) {
					this.newline();
				} else {
					this.write(' ');
				}
			}
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

		const index = this.#commands.length;

		const open = this.new();
		const join = this.new();
		const close = this.new();

		this.#commands.push(open.#commands);

		const child_context = this.child();

		let prev;

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];
			const is_first = i === 0;
			const is_last = i === nodes.length - 1;

			if (node) {
				if (!is_first && !prev) {
					this.#commands.push(join.#commands);
				}

				child_context.visit(node);

				if (!is_last) {
					this.#commands.push(separator);
				}

				if (this.comments.length > 0) {
					this.#commands.push(' ');

					while (this.comments.length) {
						const comment = /** @type {TSESTree.Comment} */ (this.comments.shift());

						push_comment(comment, this);

						if (!is_last) {
							if (comment.type === 'Line') {
								this.newline();
							} else {
								this.#commands.push(join.#commands);
							}
						}
					}

					child_context.multiline = true;
				} else {
					if (!is_last) this.#commands.push(join.#commands);
				}
			} else {
				// This is only used for ArrayPattern and ArrayExpression, but
				// it makes more sense to have the logic here than there, because
				// otherwise we'd duplicate a lot more stuff
				this.#commands.push(separator);
			}

			prev = node;
		}

		this.#commands.push(close.#commands);

		if (child_context.multiline || measure(this.#commands, index) > 50) {
			this.multiline = true;

			open.indent();
			open.newline();
			join.newline();
			close.dedent();
			close.newline();
		} else {
			if (pad) open.write(' ');
			join.write(' ');
			if (pad) close.write(' ');
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

			const child_context = this.child();
			child_context.visit(statement);

			if (child_context.multiline || needs_margin || add_margin(last_statement, statement)) {
				margin.push('\n');
			}

			let add_newline = false;

			while (this.comments.length) {
				const comment = /** @type {TSESTree.Comment} */ (this.comments.shift());

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

	// TODO get rid of in favour of `new`
	child() {
		return new Context(this.#handlers, this.#quote, this.#commands, this.comments);
	}

	new() {
		return new Context(this.#handlers, this.#quote);
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
			total +=
				command.length === 0
					? 2 // assume this is ', '
					: measure(command);
		}
	}

	return total;
}
