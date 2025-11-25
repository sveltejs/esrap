import { TSESTree } from '@typescript-eslint/types';

export type TSOptions = {
	quotes?: 'double' | 'single';
	comments?: Comment[];
	getLeadingComments?: (node: TSESTree.Node) => BaseComment[] | undefined;
	getTrailingComments?: (node: TSESTree.Node) => BaseComment[] | undefined;
};

interface Position {
	line: number;
	column: number;
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
