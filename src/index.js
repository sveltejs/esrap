/** @import { BaseNode, Command, Visitors, PrintOptions } from './types' */
import { encode } from '@jridgewell/sourcemap-codec';
import { Context, dedent, indent, margin, newline } from './context.js';

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

/**
 * @template {BaseNode} [T=BaseNode]
 * @param {{ type: string, [key: string]: any }} node
 * @param {Visitors<T>} visitors
 * @param {PrintOptions} opts
 * @returns {{ code: string, map: any }} // TODO
 */
export function print(node, visitors, opts = {}) {
	/** @type {Command[]} */
	const commands = [];

	// @ts-expect-error some nonsense I don't understand
	const context = new Context(visitors, commands);

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

	let current_newline = '\n';
	const indent_str = opts.indent ?? '\t';

	let needs_newline = false;
	let needs_margin = false;

	/** @param {Command} command */
	function run(command) {
		if (Array.isArray(command)) {
			for (let i = 0; i < command.length; i += 1) {
				run(command[i]);
			}
			return;
		}

		if (typeof command === 'number') {
			if (command === newline) {
				needs_newline = true;
			} else if (command === margin) {
				needs_margin = true;
			} else if (command === indent) {
				current_newline += indent_str;
			} else if (command === dedent) {
				current_newline = current_newline.slice(0, -indent_str.length);
			}

			return;
		}

		if (needs_newline) {
			append(needs_margin ? '\n' + current_newline : current_newline);
		}

		needs_margin = needs_newline = false;

		if (typeof command === 'string') {
			append(command);
			return;
		}

		if (command.type === 'Location') {
			current_line.push([
				current_column,
				0, // source index is always zero
				command.line - 1,
				command.column
			]);
		}
	}

	for (let i = 0; i < commands.length; i += 1) {
		run(commands[i]);
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
