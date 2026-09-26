/** @import { BaseNode, Command, Location, Visitors, PrintOptions } from './types.js' */
import { encode } from '@jridgewell/sourcemap-codec';
import { Context, dedent, indent, margin, newline, space } from './context.js';
import { Tokens } from './tokens.js';

/** @type {(str: string) => string} str */
let btoa = () => {
	throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
};

if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
	btoa = (str) => window.btoa(unescape(encodeURIComponent(str)));
} else if (typeof Buffer === 'function') {
	btoa = (str) => Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * @typedef {[generatedColumn: number, sourceIndex: number, originalLine: number, originalColumn: number]
 *   | [generatedColumn: number, sourceIndex: number, originalLine: number, originalColumn: number, nameIndex: number]
 * } Segment
 */

class SourceMap {
	version = 3;

	/** @type {string[]} */
	names;

	/**
	 * @param {Segment[][]} mappings
	 * @param {string[]} names
	 * @param {PrintOptions} opts
	 */
	constructor(mappings, names, opts) {
		this.names = names;
		this.sources = [opts.sourceMapSource || null];
		this.sourcesContent = [opts.sourceMapContent || null];
		this.mappings = opts.sourceMapEncodeMappings === false ? mappings : encode(mappings);
	}

	/**
	 * Returns a JSON representation suitable for saving as a `*.map` file
	 */
	toString() {
		return JSON.stringify(this);
	}

	/**
	 * Returns a base64-encoded JSON representation suitable for inlining at the bottom of a file with `//# sourceMappingURL={...}`
	 */
	toUrl() {
		return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
	}
}

/**
 * @template {BaseNode} [T=BaseNode]
 * @param {T} node
 * @param {Visitors<T>} visitors
 * @param {PrintOptions} opts
 * @returns {{ code: string, map: any }} // TODO
 */
export function print(node, visitors, opts = {}) {
	/** @type {Command[]} */
	const commands = [];

	const tokens = opts.tokens ? new Tokens(opts.tokens) : null;

	// @ts-ignore some nonsense I don't understand
	const context = new Context(visitors, commands, tokens);

	context.visit(node);

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
	let needs_space = false;

	/** @type {Location[]} */
	const pending_locations = [];

	/** @type {string[]} */
	const names = [];

	/** @type {Map<string, number>} */
	const name_indices = new Map();

	/** @param {string} name */
	function get_name_index(name) {
		let index = name_indices.get(name);

		if (index === undefined) {
			index = names.push(name) - 1;
			name_indices.set(name, index);
		}

		return index;
	}

	/** @param {Location} location */
	function add_location(location) {
		const prev = current_line[current_line.length - 1];
		const line = location.line - 1;
		const column = location.column;

		if (prev && prev[0] === current_column && prev[2] === line && prev[3] === column) {
			// the same location can be mapped more than once (e.g. an identifier's start is mapped
			// by the root visitor, then again with its name) — keep the first name we're given
			if (location.name !== undefined && prev.length === 4) {
				prev.push(get_name_index(location.name));
			}

			return;
		}

		/** @type {Segment} */
		const segment = [
			current_column,
			0, // source index is always zero
			line,
			column
		];

		if (location.name !== undefined) {
			segment.push(get_name_index(location.name));
		}

		current_line.push(segment);
	}

	function flush_locations() {
		for (const location of pending_locations) {
			add_location(location);
		}

		pending_locations.length = 0;
	}

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
			} else if (command === space) {
				needs_space = true;
			} else if (command === indent) {
				current_newline += indent_str;
			} else if (command === dedent) {
				// `slice(0, -0)` would return an empty string, dropping the newline
				current_newline = current_newline.slice(0, current_newline.length - indent_str.length);
			}

			return;
		}

		if (typeof command === 'string') {
			if (needs_newline) {
				append(needs_margin ? '\n' + current_newline : current_newline);
			} else if (needs_space) {
				append(' ');
			}

			needs_margin = needs_newline = needs_space = false;

			flush_locations();
			append(command);
			return;
		}

		if (command.type === 'Location') {
			// Locations must not flush whitespace, but should follow it if more text is written.
			if (needs_newline || needs_space) {
				pending_locations.push(command);
			} else {
				add_location(command);
			}
		}
	}

	for (let i = 0; i < commands.length; i += 1) {
		run(commands[i]);
	}

	// Preserve trailing mappings without emitting trailing whitespace.
	flush_locations();
	mappings.push(current_line);

	/** @type {SourceMap} */
	let map;

	return {
		code,
		// create sourcemap lazily in case we don't need it
		get map() {
			return (map ??= new SourceMap(mappings, names, opts));
		}
	};
}

// it sucks that we have to export the class rather than just
// re-exporting it via public.d.ts, but otherwise TypeScript
// gets confused about private fields because it is really dumb!
export { Context };
