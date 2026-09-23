/** @import { Visitors } from '../types.js' */
import { expect, test } from 'vitest';
import { print } from '../src/index.js';

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
