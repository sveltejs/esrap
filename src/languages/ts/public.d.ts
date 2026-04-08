import type { Visitors, BaseNode } from '../../types';
import type { TSOptions, BaseComment, Comment } from '../types';
export type { BaseComment, Comment };
export type { TSOptions };
export default function ts(options?: TSOptions): Visitors<BaseNode>;
export declare const EXPRESSIONS_PRECEDENCE: Record<string, number>;
