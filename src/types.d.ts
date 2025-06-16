import { TSESTree } from '@typescript-eslint/types';
import type { Context } from './context.js';

type BaseNode = { type: string };

type NodeOf<T extends string, X> = X extends { type: T } ? X : never;

type SpecialisedVisitors<T extends BaseNode> = {
	[K in T['type']]?: Visitor<NodeOf<K, T>>;
};

export type Visitor<T> = (node: T, context: Context) => void;

export type Visitors<T extends BaseNode = BaseNode> = T['type'] extends '_'
	? never
	: SpecialisedVisitors<T> & { _?: (node: T, context: Context, visit: (node: T) => void) => void };

export { Context };

export type TypeAnnotationNodes =
	| TSESTree.TypeNode
	| TSESTree.TypeElement
	| TSESTree.TSTypeAnnotation
	| TSESTree.TSPropertySignature
	| TSESTree.TSTypeParameter
	| TSESTree.TSTypeParameterDeclaration
	| TSESTree.TSTypeParameterInstantiation
	| TSESTree.TSEnumMember
	| TSESTree.TSInterfaceHeritage
	| TSESTree.TSClassImplements
	| TSExpressionWithTypeArguments;

type TSExpressionWithTypeArguments = {
	type: 'TSExpressionWithTypeArguments';
	expression: any;
};

export interface Location {
	type: 'Location';
	line: number;
	column: number;
}

export interface Margin {
	type: 'Margin';
}

export interface Newline {
	type: 'Newline';
}

export interface Indent {
	type: 'Indent';
}

export interface Dedent {
	type: 'Dedent';
}

export interface IndentChange {
	type: 'IndentChange';
	offset: number;
}

export type Command = string | Location | Margin | Newline | Indent | Dedent | Command[];

export interface PrintOptions<T extends BaseNode = BaseNode> {
	sourceMapSource?: string;
	sourceMapContent?: string;
	sourceMapEncodeMappings?: boolean; // default true
	indent?: string; // default tab
	quotes?: 'single' | 'double'; // default single
	visitors?: Visitors<T>; // default to ts
}
