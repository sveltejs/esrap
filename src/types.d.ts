import { Comment, Node } from 'estree';

type NodeOf<T extends string, X> = X extends { type: T } ? X : never;

type Handler<T> = (node: T, state: State) => void;

export type Handlers = {
	[K in Node['type']]: Handler<NodeOf<K, Node>>;
};

export interface State {
	commands: Command[];
	comments: Comment[];
	multiline: boolean;
}

export interface Chunk {
	type: 'Chunk';
	content: string;
	loc: null | {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
}

export interface Indent {
	type: 'Indent';
}

export interface IndentChange {
	type: 'IndentChange';
	offset: number;
}

export interface Conditional {
	type: 'Conditional';
	condition: boolean;
	consequent: Command;
	alternate: Command;
}

export interface Sequence {
	type: 'Sequence';
	children: Command[];
}

export type Command = string | Chunk | Indent | IndentChange | Conditional | Sequence;
