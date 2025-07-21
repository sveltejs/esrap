/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { BaseNode, Command, Visitors } from './types' */

export const margin = 0;
export const newline = 1;
export const indent = 2;
export const dedent = 3;
export const space = 4;

/**
* Get the line and column number from a character index in the source text.
*
* @param {number} charIndex
* @param {string} sourceText
* @returns {{ line: number, column: number }}
*/
function getLineAndColumn(charIndex, sourceText) {
	const lineZeroBased = sourceText.slice(0, charIndex).split('\n');
	const columnZeroBased = lineZeroBased[lineZeroBased.length - 1].length;
	return {
		line: lineZeroBased.length + 1,
		column: columnZeroBased
	};
}

export class Context {
	#visitors;
	#commands;
	#has_newline = false;
	#sourceText = undefined;

	multiline = false;

	/**
	 *
	 * @param {Visitors} visitors
	 * @param {Command[]} commands
	 */
	constructor(visitors, commands = [], sourceText = undefined) {
		this.#visitors = visitors;
		this.#commands = commands;
		this.#sourceText = sourceText;
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

		if (this.#has_newline) {
			this.multiline = true;
		}
	}

	/**
	 *
	 * @param {string} content
	 * @param {BaseNode} [node]
	 */
	write(content, node) {
		if (node?.loc) {
			this.location(node.loc.start.line, node.loc.start.column);
			this.#commands.push(content);
			this.location(node.loc.end.line, node.loc.end.column);
		} else {
			this.#commands.push(content);
		}

		if (this.#has_newline) {
			this.multiline = true;
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
	 * @param {{ type: string, start?: number, end?: number }} node
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

		if (node.start != null && this.#sourceText) {
			const { line, column } = getLineAndColumn(node.start, this.#sourceText);
			this.location(line, column);
		}

		if (this.#visitors._) {
			// @ts-ignore
			this.#visitors._(node, this, (node) => visitor(node, this));
		} else {
			// @ts-ignore
			visitor(node, this);
		}
		if (node.end != null && this.#sourceText) {
			const { line, column } = getLineAndColumn(node.end, this.#sourceText);
			this.location(line, column);
		}
	}

	empty() {
		return !this.#commands.some(has_content);
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
