import { expect, test } from 'vitest';
import { print } from '../src';

/** @import { Visitors } from '../types' */
test('custom printers work', () => {
	/** @type {Visitors} */
	const funkyStringPrinter = {
		CustomType(node, state) {
			if (typeof node.value === 'string') {
				state.write(`:) - `);

				state.write(node.value);

				state.write(` - (:`);
			}
		}
	};

	const { code } = print(
		{
			type: 'CustomType',
			value: 'testing 123'
		},
		{
			visitors: { ...funkyStringPrinter }
		}
	);

	expect(code).toEqual(':) - testing 123 - (:');
});
