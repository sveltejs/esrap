import type { TSESTree } from '@typescript-eslint/types';

export type TSOptions = {
	quotes?: 'double' | 'single';
	comments?: TSESTree.Comment[];
};
