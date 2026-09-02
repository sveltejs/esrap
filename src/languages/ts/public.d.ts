import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment, SourceToken } from '../types';
export type { BaseComment, Comment, SourceToken };
export type Node = BaseNode;
export default function ts(options?: TSOptions): Visitors<BaseNode>;
// was Record<TSESTree.Expression['type'] | 'Super' | 'RestElement', number>
export declare const EXPRESSIONS_PRECEDENCE: Record<string, number>;
