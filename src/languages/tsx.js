/** @import { Visitors } from '../types' */
import { TSESTree } from '@typescript-eslint/types';
import ts from './ts.js';
import jsx from './jsx.js';

/** @returns {Visitors<TSESTree.Node>} */
export default () => ({
	...jsx(),
	...ts()
});
