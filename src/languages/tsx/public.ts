import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment, SourceToken } from '../types';
export type { BaseComment, Comment, SourceToken };
export type Node = BaseNode;
declare function tsx(options?: TSOptions): Visitors<BaseNode>;
export default tsx;
