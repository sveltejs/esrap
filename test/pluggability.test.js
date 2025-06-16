import { expect, test } from 'vitest';
import { print } from '../src';

/** @import { Visitors } from '../types' */
test('custom printers work', () => {
	const { code } = print(
		{
			type: 'CustomType',
			value: 'testing 123'
		},
		{
			CustomType(node, context) {
				if (typeof node.value === 'string') {
					context.write(`:) - `);

					context.write(node.value);

					context.write(` - (:`);
				}
			}
		}
	);

	expect(code).toEqual(':) - testing 123 - (:');
});
