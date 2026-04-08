import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment } from '../types';
export type { BaseComment, Comment };
export type { TSOptions };
export default function tsx(options?: TSOptions): Visitors<BaseNode>;
