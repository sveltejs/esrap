/** @import { Visitors } from '../types' */
import { TSESTree } from '@typescript-eslint/types';
import ts from './ts.js';
import jsx from './jsx.js';

/** @type {Visitors<TSESTree.Node>} */
export default {
	...jsx,
	...ts
};
