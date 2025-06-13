import { expect, test } from 'vitest';
import { print } from '../src';

/** @import { Handlers } from '../types' */
test('custom printers work', () => {
	/** @type {Handlers} */
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
			handlers: { ...funkyStringPrinter }
		}
	);

	expect(code).toEqual(':) - testing 123 - (:');
});
