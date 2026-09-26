import type { Context } from 'esrap';

export type BaseNode = {
	type: string;
	loc?: null | {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
};

type NodeOf<T extends string, X> = X extends { type: T } ? X : never;

type SpecialisedVisitors<T extends BaseNode> = {
	[K in T['type']]?: Visitor<NodeOf<K, T>>;
};

export type Visitor<T> = (node: T, context: Context) => void;

export type Visitors<T extends BaseNode = BaseNode> = T['type'] extends '_'
	? never
	: SpecialisedVisitors<T> & { _?: (node: T, context: Context, visit: (node: T) => void) => void };

export { Context };

type TSExpressionWithTypeArguments = {
	type: 'TSExpressionWithTypeArguments';
	expression: any;
};

export interface Location {
	type: 'Location';
	line: number;
	column: number;
}

export interface IndentChange {
	type: 'IndentChange';
	offset: number;
}

export type Command = string | number | Location | Command[];

export interface PrintOptions {
	sourceMapSource?: string;
	sourceMapContent?: string;
	sourceMapEncodeMappings?: boolean; // default true
	indent?: string; // default tab
	/**
	 * The parser's tokens — e.g. Acorn's `onToken` array, or `ast.tokens` from
	 * typescript-eslint or espree. When provided, punctuation and keywords
	 * written by visitors are mapped to their location in the source
	 */
	tokens?: readonly Token[];
}

/**
 * A token produced by a parser. Acorn and Babel tokens have a `type` object
 * with a `label`; ESLint-style tokens have a string `type` and a `value`
 */
export interface Token {
	type?: string | { label?: string };
	value?: unknown;
	loc?: null | {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}
