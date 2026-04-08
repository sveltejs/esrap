export type { PrintOptions, Visitors } from './types';
export { Context } from './index';

import type { BaseNode, PrintOptions, Visitors } from './types';

export function print<T extends BaseNode = BaseNode>(
	node: T,
	visitors: Visitors<T>,
	opts?: PrintOptions
): {
	code: string;
	map: any;
};
export function print(
	node: BaseNode,
	visitors: Record<string, Function>,
	opts?: PrintOptions
): {
	code: string;
	map: any;
};
