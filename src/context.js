/** @import { BaseNode, Command, Location, Visitors } from './types.js' */
/** @import { Tokens } from './tokens.js' */

export const margin = 0;
export const newline = 1;
export const indent = 2;
export const dedent = 3;
export const space = 4;

export class Context {
	#visitors;
	#commands;
	#tokens;
	#has_newline = false;

	multiline = false;

	/**
	 *
	 * @param {Visitors} visitors
	 * @param {Command[]} commands
	 * @param {Tokens | null} tokens
	 */
	constructor(visitors, commands = [], tokens = null) {
		this.#visitors = visitors;
		this.#commands = commands;
		this.#tokens = tokens;
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
		this.#has_newline = true;
		this.#commands.push(newline);
	}

	space() {
		this.#commands.push(space);
	}

	/**
	 * @param {Context} context
	 */
	append(context) {
		this.#commands.push(context.#commands);

		if (this.#has_newline || context.multiline) {
			this.multiline = true;
		}
	}

	/**
	 * Write `content`. If `node` is provided, `content` is mapped to its location. Otherwise, if `tokens`
	 * were passed to `print` and `content` (ignoring surrounding whitespace) is the next token
	 * in the source, it is mapped to that token's location.
	 * @param {string} content
	 * @param {BaseNode} [node]
	 */
	write(content, node) {
		const value = this.#tokens && content.trim();
		const token = value
			? this.#tokens?.consume(value, node?.loc?.start, node?.loc?.end)
			: undefined;

		if (node?.loc) {
			this.location(node.loc.start.line, node.loc.start.column);
			this.#commands.push(content);
			this.location(node.loc.end.line, node.loc.end.column);
		} else if (token && value) {
			const start = content.indexOf(value);
			const end = start + value.length;

			if (start > 0) this.#commands.push(content.slice(0, start));
			this.location(token.start.line, token.start.column);
			this.#commands.push(value);
			this.location(token.end.line, token.end.column);
			if (end < content.length) this.#commands.push(content.slice(end));
		} else {
			this.#commands.push(content);
		}

		if (this.#has_newline) {
			this.multiline = true;
		}
	}

	/**
	 * Insert a sourcemap mapping. If `name` is `true` and `tokens` were passed to `print`,
	 * the token at this location in the source is added to the sourcemap's `names`
	 * @param {number} line
	 * @param {number} column
	 * @param {boolean} [name]
	 */
	location(line, column, name = false) {
		/** @type {Location} */
		const location = { type: 'Location', line, column };

		if (name) {
			const token = this.#tokens?.at({ line, column });
			if (token) location.name = token.value;
		}

		this.#commands.push(location);
	}

	/**
	 * @param {{ type: string }} node
	 */
	visit(node) {
		const visitor = this.#visitors[node.type];

		if (!visitor) {
			let message = `Not implemented: ${node.type}`;

			if (node.type.includes('TS')) {
				message += ` (consider using 'esrap/languages/ts')`;
			}

			if (node.type.includes('JSX')) {
				message += ` (consider using 'esrap/languages/tsx')`;
			}

			throw new Error(message);
		}

		const tokens = this.#tokens;
		const previous = tokens?.enter(node);

		if (this.#visitors._) {
			// @ts-ignore
			this.#visitors._(node, this, (node) => visitor(node, this));
		} else {
			// @ts-ignore
			visitor(node, this);
		}

		if (previous) tokens?.exit(node, previous);
	}

	empty() {
		return !this.#commands.some(has_content);
	}

	measure() {
		return measure(this.#commands);
	}

	new() {
		return new Context(this.#visitors, [], this.#tokens);
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

/**
 * @param {Command} command
 */
function has_content(command) {
	if (Array.isArray(command)) {
		return command.some(has_content);
	}

	if (typeof command === 'string') {
		return command.length > 0;
	}

	return false;
}
