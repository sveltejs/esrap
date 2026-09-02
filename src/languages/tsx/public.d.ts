import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment, SourceToken } from '../types';
export type { BaseComment, Comment, SourceToken };
export type Node = BaseNode;
export default function tsx(options?: TSOptions): Visitors<BaseNode>;
