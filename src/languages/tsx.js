/** @import { Visitors } from '../types' */
import { TSESTree } from '@typescript-eslint/types';
import ts from './ts.js';
import jsx from './jsx.js';

/**
 * @param {Parameters<typeof ts>[0]} [options]
 * @returns {Visitors<TSESTree.Node>}
 */
export default (options) => ({
	...jsx(options),
	...ts(options)
});
