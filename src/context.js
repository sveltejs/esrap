/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Command, Dedent, Visitors, Indent, Newline, Margin } from './types' */

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
	#commands;

	multiline = false;

	/**
	 *
	 * @param {Visitors} visitors
	 * @param {Command[]} commands
	 */
	constructor(visitors, commands = []) {
		this.#visitors = visitors;
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

	measure() {
		return measure(this.#commands);
	}

	new() {
		return new Context(this.#visitors);
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
