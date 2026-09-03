/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { SourceToken, TSOptions } from '../types.js' */

/** @typedef {{ line: number, column: number }} Position */
/** @typedef {{ start: Position, end: Position }} Location */

/** The delimiters that can be located from a parser's token stream */
const DELIMITERS = new Set(['(', ')', '[', ']', '{', '}', '${']);

/**
 * Orders two positions: negative when `a` comes first, positive when `b` does
 * @param {Position} a
 * @param {Position} b
 */
export function compare_positions(a, b) {
	return a.line - b.line || a.column - b.column;
}

/**
 * The punctuator a parser token stands for. Acorn and Babel put it on
 * `type.label`; ESLint-style tokens (espree, typescript-eslint) use
 * `type: 'Punctuator'` with the punctuator in `value`.
 * @param {SourceToken} token
 */
function punctuator(token) {
	const { type } = token;
	if (typeof type === 'object') return type.label;
	if (type === 'Punctuator') return token.value;
	return type;
}

/**
 * Synthetic one-token nodes that give structural tokens (`(`, `[`, `{`, unary
 * operators, …) sourcemap anchors. Without them, everything up to the next
 * mapped token is attributed to the previous token's source position, because
 * `write(content, node)` only maps content written with a node. Opt-in via
 * `boundaryTokens`: denser maps, byte-identical output.
 *
 * Tokens at a node's own boundary are derived from its `loc`. Tokens internal
 * to a node (the brackets around a computed key, the parentheses of a call or
 * an `if`) are looked up in the parser's token stream when `tokens` is
 * supplied, and are otherwise left unmapped rather than guessed.
 *
 * @param {TSOptions} options
 */
export function boundary_tokens(options) {
	let instance = instances.get(options);
	if (!instance) {
		instance = create_boundary_tokens(options);
		instances.set(options, instance);
	}
	return instance;
}

/** One instance per options object, so `tsx` shares the delimiter index built for `ts` */
/** @type {WeakMap<TSOptions, ReturnType<typeof create_boundary_tokens>>} */
const instances = new WeakMap();

/** @param {TSOptions} options */
function create_boundary_tokens(options) {
	const enabled = options.boundaryTokens === true;

	/**
	 * The delimiter tokens from `options.tokens`, in source order
	 * @type {{ value: string, loc: Location }[] | undefined}
	 */
	let delimiters;

	function get_delimiters() {
		if (delimiters === undefined) {
			delimiters = [];
			let sorted = true;

			for (const token of options.tokens ?? []) {
				const value = punctuator(token);
				if (typeof value !== 'string' || !DELIMITERS.has(value) || !token.loc) continue;

				const previous = delimiters[delimiters.length - 1];
				if (previous && compare_positions(previous.loc.start, token.loc.start) > 0) sorted = false;
				delimiters.push({ value, loc: token.loc });
			}

			// a backtracking parser can re-emit tokens; the binary search needs monotone positions
			if (!sorted) {
				delimiters.sort((a, b) => compare_positions(a.loc.start, b.loc.start));
			}
		}

		return delimiters;
	}

	/**
	 * The nearest `value` delimiter on `side` of `pos`, without leaving `node`
	 * @param {TSESTree.Node} node
	 * @param {string} value
	 * @param {Position} pos
	 * @param {'before' | 'after'} side
	 */
	function find(node, value, pos, side) {
		if (!node.loc) return undefined;

		const tokens = get_delimiters();
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

	/** @param {Location | undefined} loc */
	function token_node(loc) {
		if (!enabled || !loc) return undefined;
		return /** @type {any} */ ({ loc });
	}

	/**
	 * A token of `length` characters starting at `pos`
	 * @param {Position | undefined} pos
	 * @param {number} [length]
	 */
	function token_at(pos, length = 1) {
		return token_node(pos && { start: pos, end: { line: pos.line, column: pos.column + length } });
	}

	/**
	 * A one-character token ending at `pos`
	 * @param {Position | undefined} pos
	 */
	function token_before(pos) {
		return token_node(
			pos && pos.column > 0
				? { start: { line: pos.line, column: pos.column - 1 }, end: pos }
				: undefined
		);
	}

	/**
	 * The `value` delimiter nearest to `pos` on `side`, located from the
	 * parser's tokens. `undefined` when it cannot be located — because `tokens`
	 * were not supplied, or because the delimiter does not exist in the source.
	 * @param {TSESTree.Node} node
	 * @param {string} value
	 * @param {Position | undefined} pos
	 * @param {'before' | 'after'} side
	 */
	function located_token(node, value, pos, side) {
		if (!enabled || !pos) return undefined;
		return token_node(find(node, value, pos, side));
	}

	/**
	 * The delimiter that opens (just before `inner`) or closes (just after
	 * `inner`) a bracketed part of `node`.
	 * @param {TSESTree.Node} node
	 * @param {TSESTree.Node | null | undefined} inner
	 * @param {'(' | ')' | '[' | ']' | '{' | '}' | '${'} value
	 */
	function enclosing_token(node, inner, value) {
		const opening = value !== ')' && value !== ']' && value !== '}';
		return located_token(
			node,
			value,
			opening ? inner?.loc?.start : inner?.loc?.end,
			opening ? 'before' : 'after'
		);
	}

	return { token_at, token_before, located_token, enclosing_token };
}
