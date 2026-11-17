/** @import { BaseNode, Token } from './types.js' */

/**
 * @typedef {{ line: number, column: number }} Position
 * @typedef {{ value: string, start: Position, end: Position, pair: number }} Entry
 * @typedef {{ lo: number, hi: number, openers: Opener[] }} Frame
 * @typedef {{ value: string, pair: number }} Opener
 */

/** Acorn/Babel token types that don't correspond to anything written verbatim */
const IGNORED = new Set([
	'string',
	'num',
	'bigint',
	'decimal',
	'regexp',
	'template',
	'invalidTemplate',
	'privateId',
	'jsxText',
	'eof'
]);

/** ESLint-style token types (espree, typescript-eslint) whose `value` is written verbatim */
const VERBATIM = new Set([
	'Punctuator',
	'Keyword',
	'Identifier',
	'Boolean',
	'Null',
	'JSXIdentifier'
]);

/** @type {Record<string, string>} */
const OPENERS = { ')': '(', ']': '[', '}': '{' };

/**
 * The text a parser token stands for, or `null` if it's not something a printer writes as-is.
 * Acorn and Babel describe tokens with a `type` object whose `label` is the punctuator (or
 * `name` for identifiers and contextual keywords), with operators and words in `value`.
 * ESLint-style tokens have a string `type` and the source text in `value`.
 * @param {Token} token
 * @returns {string | null}
 */
function text(token) {
	const { type, value } = token;

	if (typeof type === 'object' && type !== null) {
		const label = type.label;
		if (label === undefined || IGNORED.has(label)) return null;
		if (label === 'jsxTagStart') return '<';
		if (label === 'jsxTagEnd') return '>';
		return typeof value === 'string' ? value : label;
	}

	if (typeof type === 'string' && VERBATIM.has(type) && typeof value === 'string') {
		return value;
	}

	return null;
}

/**
 * @param {Position} a
 * @param {Position} b
 */
function compare(a, b) {
	return a.line - b.line || a.column - b.column;
}

/**
 * Tracks which of the parser's tokens have been written, so that `context.write`
 * can map a token to its source location. Each `context.visit` narrows the search to
 * the tokens inside the visited node; each written token advances the cursor past it.
 */
export class Tokens {
	/** @type {Entry[]} */
	#entries = [];

	/** @type {Frame} */
	#frame = { lo: 0, hi: 0, openers: [] };

	/** @param {readonly Token[]} tokens */
	constructor(tokens) {
		/** @type {Entry[]} */
		const entries = [];

		for (const token of tokens) {
			if (!token.loc) continue;
			const value = text(token);
			if (value === null) continue;
			entries.push({ value, start: token.loc.start, end: token.loc.end, pair: -1 });
		}

		// parsers that backtrack (e.g. acorn-typescript) can emit tokens more than once, or out
		// of order. Keep the last token emitted at each position, and drop any that overlap
		entries.sort((a, b) => compare(a.start, b.start));

		for (const entry of entries) {
			const previous = this.#entries[this.#entries.length - 1];

			if (previous && compare(previous.start, entry.start) === 0) {
				this.#entries[this.#entries.length - 1] = entry;
			} else if (!previous || compare(previous.end, entry.start) <= 0) {
				this.#entries.push(entry);
			}
		}

		// pair up brackets, so that a closing bracket can be found from its opening bracket
		// regardless of any redundant parentheses or trailing commas in between
		/** @type {number[]} */
		const stack = [];

		for (let i = 0; i < this.#entries.length; i += 1) {
			const { value } = this.#entries[i];

			if (value === '(' || value === '[' || value === '{' || value === '${') {
				stack.push(i);
			} else if (value in OPENERS) {
				const opener = stack.pop();
				if (opener === undefined) continue;

				const expected = this.#entries[opener].value;
				if (expected === OPENERS[value] || (value === '}' && expected === '${')) {
					this.#entries[opener].pair = i;
					this.#entries[i].pair = opener;
				}
			}
		}
	}

	/**
	 * Bound the search to the tokens within `node`. If `node` has no location, disable
	 * searching until a descendant with a location is visited
	 * @param {BaseNode} node
	 * @returns {Frame} the previous state, to be passed to `exit`
	 */
	enter(node) {
		const previous = this.#frame;

		if (node.loc) {
			let lo = this.#search(node.loc.start);
			const hi = this.#search(node.loc.end);

			// if the parent has already written tokens inside this node (e.g. the decorators
			// of an exported class, which are printed before `export`), skip them
			if (previous.lo > lo && previous.lo < hi) lo = previous.lo;

			this.#frame = { lo, hi, openers: [] };
		} else {
			this.#frame = { lo: 0, hi: 0, openers: [] };
		}

		return previous;
	}

	/**
	 * Restore the state from before `enter`, advancing the cursor past `node`
	 * @param {BaseNode} node
	 * @param {Frame} previous
	 */
	exit(node, previous) {
		this.#frame = previous;
		if (node.loc) this.skip(node.loc.end);
	}

	/**
	 * Advance the cursor past `position`
	 * @param {Position} position
	 */
	skip(position) {
		this.#frame.lo = Math.max(this.#frame.lo, this.#search(position));
	}

	/**
	 * If `value` is the next unwritten token, consume it and return it. A closing
	 * bracket matches the partner of the opening bracket that was last written
	 * @param {string} value
	 * @param {Position} [from] only match tokens starting at or after this position
	 * @param {Position} [to] only match tokens ending at or before this position
	 * @returns {Entry | undefined}
	 */
	consume(value, from, to) {
		const frame = this.#frame;
		const is_opener = value === '(' || value === '[' || value === '{' || value === '${';

		if (value in OPENERS) {
			const opener = frame.openers[frame.openers.length - 1];

			if (opener && (opener.value === OPENERS[value] || (value === '}' && opener.value === '${'))) {
				frame.openers.pop();

				const i = opener.pair;
				if (i === -1 || i >= frame.hi) return;

				frame.lo = Math.max(frame.lo, i + 1);
				return this.#entries[i];
			}
		}

		const entry = frame.lo < frame.hi ? this.#entries[frame.lo] : undefined;

		const match =
			entry !== undefined &&
			entry.value === value &&
			(!from || compare(entry.start, from) >= 0) &&
			(!to || compare(entry.end, to) <= 0);

		if (is_opener) {
			frame.openers.push({ value, pair: match ? entry.pair : -1 });
		}

		if (match) {
			frame.lo += 1;
			return entry;
		}
	}

	/**
	 * The token starting at exactly `position`, if any, regardless of what has been written
	 * @param {Position} position
	 * @returns {Entry | undefined}
	 */
	at(position) {
		const entry = this.#entries[this.#search(position)];
		if (entry && compare(entry.start, position) === 0) return entry;
	}

	/**
	 * The index of the first token starting at or after `position`
	 * @param {Position} position
	 */
	#search(position) {
		let lo = 0;
		let hi = this.#entries.length;

		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (compare(this.#entries[mid].start, position) < 0) lo = mid + 1;
			else hi = mid;
		}

		return lo;
	}
}
