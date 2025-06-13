/** @import { Command, Handlers, PrintOptions } from './types' */
import { encode } from '@jridgewell/sourcemap-codec';
import { Context } from './context.js';
import ts from './languages/ts.js';

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

	/** @type {Command[]} */
	const commands = [];

	const context = new Context(
		opts.handlers ?? /** @type {Handlers} */ (ts),
		opts.quotes === 'double' ? '"' : "'",
		commands
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
