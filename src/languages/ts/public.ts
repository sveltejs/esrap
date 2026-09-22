import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment } from '../types';
export type { BaseComment, Comment };
export type Node = BaseNode;
declare function ts(options?: TSOptions): Visitors<BaseNode>;
export default ts;
// was Record<TSESTree.Expression['type'] | 'Super' | 'RestElement', number>
export declare const EXPRESSIONS_PRECEDENCE: Record<string, number>;
