import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment } from '../types';
export type { BaseComment, Comment };
export type Node = BaseNode;
declare function tsx(options?: TSOptions): Visitors<BaseNode>;
export default tsx;
