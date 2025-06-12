/** @import { Command, Dedent, Handlers, Indent, Newline, NodeWithComments, PrintOptions } from './types' */
import { encode } from '@jridgewell/sourcemap-codec';
import js from './languages/js.js';
import typescript from './languages/typescript.js';
import { prepend_comments } from './handlers.js';

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
export const newline = { type: 'Newline' };

/** @type {Indent} */
export const indent = { type: 'Indent' };

/** @type {Dedent} */
export const dedent = { type: 'Dedent' };

export class Context {
	#handlers;

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
		this.quote = quote;
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
	 * @param {{ type: string }} node
	 */
	visit(node) {
		const node_with_comments = /** @type {NodeWithComments} */ (node);

		const handler = this.#handlers[node.type];

		if (!handler) {
			let error = [`Failed to find an implementation for ${node.type}`];

			if (node.type.includes('JSX')) {
				error.push(`hint: perhaps you need to import esrap/languages/jsx`);
			}
			if (node.type.includes('TS')) {
				error.push(`hint: perhaps you need to import esrap/languages/ts`);
			}
			if (node.type.includes('TSX')) {
				error.push(`hint: perhaps you need to import esrap/languages/js`);
			}
			if (Object.keys(this.#handlers).length < 25) {
				error.push(`hint: perhaps you added custom handlers, but forgot to use esrap/languages/js`);
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

	child() {
		return new Context(this.#handlers, this.quote, this.commands, this.comments);
	}

	// /**
	//  * @param {Context} context
	//  */
	// append(context) {
	// 	this.commands.push(...context.commands);
	// 	this.multiline ||= context.multiline;
	// }
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
		opts.handlers ?? /** @type {Handlers} */ ({ ...js, ...typescript }),
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
