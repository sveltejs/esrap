/** @import { Handlers } from '../types' */
import { TSESTree } from '@typescript-eslint/types';
import ts from './ts.js';
import jsx from './jsx.js';

/** @type {Handlers<TSESTree.Node>} */
export default {
	...jsx,
	...ts
};
