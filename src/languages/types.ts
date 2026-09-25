import type { BaseNode } from '../types.js';

export type TSOptions = {
	quotes?: 'double' | 'single';
	comments?: Comment[];
	/**
	 * The parser's tokens, with locations — Acorn's `onToken` array, Babel's
	 * `tokens`, or an ESLint-style `ast.tokens`. Used to map what sits inside
	 * a node and no node boundary locates: the brackets of a computed key, the
	 * parentheses of a call or an `if`, the braces of an import list, and the
	 * keywords after a node's first token (`function` after `async`, `else`,
	 * `finally`, a class member's second modifier). Without it those are left
	 * unmapped.
	 */
	tokens?: readonly SourceToken[];
	getLeadingComments?: (node: BaseNode) => BaseComment[] | undefined;
	getTrailingComments?: (node: BaseNode) => BaseComment[] | undefined;
};

interface Position {
	line: number;
	column: number;
}

/**
 * A parser token. The punctuator it stands for is read from `type.label`
 * (Acorn, Babel) or, for `type: 'Punctuator'` tokens (espree,
 * typescript-eslint), from `value`.
 */
export interface SourceToken {
	type?: string | { label?: string };
	value?: unknown;
	loc?: null | {
		start: Position;
		end: Position;
	};
}

// this exists in TSESTree but because of the inanity around enums
// it's easier to do this ourselves
export interface BaseComment {
	type: 'Line' | 'Block';
	value: string;
	start?: number;
	end?: number;
}

export interface Comment extends BaseComment {
	loc: {
		start: Position;
		end: Position;
	};
}
