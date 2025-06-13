import { TSESTree } from '@typescript-eslint/types';
import type { Context } from './context.js';

type Handler<T> = (node: T, context: Context) => undefined;

export { Context };

export type Handlers<T extends { type: string } = { type: string }> = {
	[Type in T['type']]?: Handler<Extract<T, { type: Type }>>;
};

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

// `@typescript-eslint/types` differs from the official `estree` spec by handling
// comments differently. This is a node which we can use to ensure type saftey.
export type NodeWithComments = {
	leadingComments?: TSESTree.Comment[] | undefined;
	trailingComments?: TSESTree.Comment[] | undefined;
} & TSESTree.Node;

export interface Location {
	type: 'Location';
	line: number;
	column: number;
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

export type Command = string | Location | Newline | Indent | Dedent | Command[];

export interface PrintOptions {
	sourceMapSource?: string;
	sourceMapContent?: string;
	sourceMapEncodeMappings?: boolean; // default true
	indent?: string; // default tab
	quotes?: 'single' | 'double'; // default single
	handlers?: Handlers; // default to ts
}
