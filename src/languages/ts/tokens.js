/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { SourceToken, TSOptions } from '../types.js' */

/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ start: Position, end: Position }} Location */

/**
 * The tokens that are looked up: delimiters, and the keywords a printer writes
 * after a node's first token (which no node boundary locates)
 */
const WORDS = new Set([
	...['(', ')', '[', ']', '{', '}', '${'],
	...['function', 'class', 'else', 'finally', 'while', 'default', 'type', 'async', 'await'],
	...['declare', 'abstract', 'static', 'readonly', 'override', 'accessor', 'get', 'set'],
	...['public', 'private', 'protected', 'const', 'enum', 'interface', 'namespace', 'module'],
	...['extends', 'implements', 'in', 'of', 'as', 'satisfies', 'new']
]);

/**
 * Negative when `a` comes before `b`, positive when after, zero when equal
 * @param {Position} a
 * @param {Position} b
 */
export function compare_positions(a, b) {
	return a.line - b.line || a.column - b.column;
}

/**
 * The punctuator or word a parser token stands for. Acorn and Babel put
 * punctuators and reserved words on `type.label` and other words (`async`,
 * `type`, `of`) in `value` with the label `name`; ESLint-style tokens (espree,
 * typescript-eslint) use `type: 'Punctuator' | 'Keyword' | 'Identifier'` with
 * the text in `value`.
 * @param {SourceToken} token
 */
function word(token) {
	const { type } = token;
	if (typeof type === 'object' && type !== null) {
		return type.label === 'name' ? token.value : type.label;
	}
	if (type === 'Punctuator' || type === 'Keyword' || type === 'Identifier') return token.value;
	return undefined;
}

/**
 * Locates tokens that sit inside a node — the brackets of a computed key, the
 * parentheses of a call or an `if`, the braces of an import list, `function`
 * after `async`, `else`, `finally` — in the parser's tokens, since no node
 * boundary records where they are. Without `tokens`, every lookup returns
 * `undefined` and the token is left unmapped rather than guessed.
 *
 * @param {TSOptions} options
 */
export function token_locator(options) {
	let instance = instances.get(options);
	if (!instance) {
		instance = create_token_locator(options);
		instances.set(options, instance);
	}
	return instance;
}

/** One instance per options object, so `tsx` shares the index built for `ts` */
/** @type {WeakMap<TSOptions, ReturnType<typeof create_token_locator>>} */
const instances = new WeakMap();

/** @param {TSOptions} options */
function create_token_locator(options) {
	/**
	 * The tokens of interest from `options.tokens`, in source order, built on
	 * the first lookup
	 * @type {{ value: string, loc: Location }[] | undefined}
	 */
	let entries;

	function get_entries() {
		if (entries === undefined) {
			entries = [];
			let sorted = true;

			for (const token of options.tokens ?? []) {
				const value = word(token);
				if (typeof value !== 'string' || !WORDS.has(value) || !token.loc) continue;

				const previous = entries[entries.length - 1];
				if (previous && compare_positions(previous.loc.start, token.loc.start) > 0) sorted = false;
				entries.push({ value, loc: token.loc });
			}

			// a backtracking parser can re-emit tokens; the binary search needs monotone positions
			if (!sorted) {
				entries.sort((a, b) => compare_positions(a.loc.start, b.loc.start));
			}
		}

		return entries;
	}

	/**
	 * The nearest `value` token on `side` of `pos`, without leaving `node`
	 * @param {TSESTree.Node} node
	 * @param {string} value
	 * @param {Position} pos
	 * @param {'before' | 'after'} side
	 * @returns {Location | undefined}
	 */
	function find(node, value, pos, side) {
		if (!node.loc) return undefined;

		const tokens = get_entries();
		let lo = 0;
		let hi = tokens.length - 1;

		if (side === 'before') {
			// rightmost token ending at or before `pos`
			while (lo <= hi) {
				const mid = (lo + hi) >> 1;
				if (compare_positions(tokens[mid].loc.end, pos) > 0) hi = mid - 1;
				else lo = mid + 1;
			}

			for (let i = hi; i >= 0; i -= 1) {
				const token = tokens[i];
				if (compare_positions(token.loc.start, node.loc.start) < 0) break;
				if (token.value === value) return token.loc;
			}
		} else {
			// leftmost token starting at or after `pos`
			while (lo <= hi) {
				const mid = (lo + hi) >> 1;
				if (compare_positions(tokens[mid].loc.start, pos) < 0) lo = mid + 1;
				else hi = mid - 1;
			}

			for (let i = lo; i < tokens.length; i += 1) {
				const token = tokens[i];
				if (compare_positions(token.loc.end, node.loc.end) > 0) break;
				if (token.value === value) return token.loc;
			}
		}
	}

	/**
	 * The location of the `value` token nearest to `pos` on `side`, or
	 * `undefined` when `tokens` were not supplied or the token is not there in
	 * the source.
	 * @param {TSESTree.Node} node
	 * @param {string} value
	 * @param {Position | undefined} pos
	 * @param {'before' | 'after'} side
	 */
	function locate(node, value, pos, side) {
		if (!options.tokens || !pos) return undefined;
		return find(node, value, pos, side);
	}

	/**
	 * The location of the delimiter that opens (just before `inner`) or closes
	 * (just after `inner`) a bracketed part of `node`.
	 * @param {TSESTree.Node} node
	 * @param {TSESTree.Node | null | undefined} inner
	 * @param {'(' | ')' | '[' | ']' | '{' | '}' | '${'} value
	 */
	function enclosing(node, inner, value) {
		const opening = value !== ')' && value !== ']' && value !== '}';
		return locate(
			node,
			value,
			opening ? inner?.loc?.start : inner?.loc?.end,
			opening ? 'before' : 'after'
		);
	}

	return { locate, enclosing };
}
