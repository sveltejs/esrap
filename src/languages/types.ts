import type { BaseNode } from '../types';

export type TSOptions = {
	quotes?: 'double' | 'single';
	/**
	 * Anchor structural tokens (brackets, braces, parentheses, unary operators)
	 * with their source locations, so those positions resolve through the source
	 * map instead of being attributed to the previous token. Tokens at a node's
	 * own boundary are located from its `loc`; tokens internal to a node (the
	 * brackets of a computed key, the parentheses of a call or an `if`) are
	 * located from `tokens` when supplied, and are otherwise left unmapped.
	 * Denser maps; identical output.
	 */
	boundaryTokens?: boolean;
	/**
	 * The parser's tokens, with locations — for example Acorn's `onToken` array,
	 * Babel's `tokens`, or an ESLint-style `ast.tokens`. Used with
	 * `boundaryTokens` to locate delimiters that node boundaries cannot give.
	 */
	tokens?: readonly SourceToken[];
	comments?: Comment[];
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
