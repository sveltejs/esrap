// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

/**
 * @param {string} name
 * @param {string[]} values
 * @param {'single' | 'double'} [quotes]
 */
function print_reanchored_shorthand(name, values, quotes = 'single') {
	const { ast } = acornParse(`const result = { ${name} };`, { fileExtension: 'js' });
	const property = /** @type {any} */ (ast.body[0]).declarations[0].init.properties[0];
	const { line, column } = property.value.loc.start;

	// Copy the value: its location may be shared with the key in parsed ASTs.
	property.value = {
		...property.value,
		loc: {
			start: { line, column: column + values.length + 1 },
			end: property.value.loc.end
		}
	};
	const comments = values.map((value, i) => ({
		type: /** @type {const} */ ('Block'),
		value,
		loc: {
			start: { line, column: column + i + 1 },
			end: { line, column: column + i + 1 }
		}
	}));

	return print(ast, ts({ comments, quotes })).code;
}

/**
 * @param {string} code
 * @param {string} name
 */
function expect_data_property(code, name) {
	const value = { marker: true };
	const result = new Function(name, `${code}\nreturn result;`)(value);

	expect(Object.hasOwn(result, name)).toBe(true);
	expect(result[name]).toBe(value);
	expect(Object.getOwnPropertyDescriptor(result, name)).toEqual({
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
	expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
}

for (const name of ['value', '__proto__']) {
	test.each([' keep ', '* @deprecated ', ' * @type {object} '])(
		`keeps ${name} shorthand with an ordinary comment: %s`,
		(comment) => {
			const code = print_reanchored_shorthand(name, [comment]);
			const { ast } = acornParse(code, { fileExtension: 'js' });
			const property = /** @type {any} */ (ast.body[0]).declarations[0].init.properties[0];

			expect(property.shorthand).toBe(true);
			expect(code).toContain(`/*${comment}*/`);
			expect_data_property(code, name);
		}
	);

	test.each([
		[['* @type {object} ']],
		[[' keep ', '* @type {object} ']],
		[['* @type {object} ', ' keep ']],
		[['* @type {object} ', '* @type {object} ']]
	])(`preserves the ${name} data property when a cast requires expansion: %j`, (comments) => {
		const code = print_reanchored_shorthand(name, comments);

		expect(() => acornParse(code, { fileExtension: 'js' })).not.toThrow();
		expect(code).toContain('/** @type {object} */ (');
		if (name === '__proto__') expect(code).toContain("['__proto__']:");
		expect_data_property(code, name);
	});
}

test.each(['value', '__proto__'])(
	'preserves the cast when the expanded %s key shares the value location',
	(name) => {
		const { ast, comments } = acornParse(`const result = { /** @type {object} */ ${name} };`, {
			fileExtension: 'js'
		});
		const property = /** @type {any} */ (ast.body[0]).declarations[0].init.properties[0];
		const { line, column } = comments[0].loc.start;
		property.loc = { start: { line, column: column - 1 }, end: property.loc.end };
		const { code } = print(ast, ts({ comments }));

		expect(code).toContain(': /** @type {object} */ (');
		expect_data_property(code, name);
	}
);

test('expanding __proto__ shorthand does not create a duplicate prototype setter', () => {
	const { ast, comments } = acornParse(
		'const result = { /** @type {object} */ __proto__, __proto__: prototype };',
		{ fileExtension: 'js' }
	);
	const property = /** @type {any} */ (ast.body[0]).declarations[0].init.properties[0];
	const { line, column } = comments[0].loc.start;
	property.loc = { start: { line, column: column - 1 }, end: property.loc.end };
	const { code } = print(ast, ts({ comments }));
	const value = { value: true };
	const prototype = { prototype: true };
	const result = new Function('__proto__', 'prototype', `${code}\nreturn result;`)(
		value,
		prototype
	);

	expect(() => acornParse(code, { fileExtension: 'js' })).not.toThrow();
	expect(Object.hasOwn(result, '__proto__')).toBe(true);
	expect(result.__proto__).toBe(value);
	expect(Object.getPrototypeOf(result)).toBe(prototype);
});

test.each(['value', '__proto__'])('does not expand a %s binding annotation', (name) => {
	const { ast, comments } = acornParse(`const { /** @type {object} */ ${name} } = source;`, {
		fileExtension: 'js'
	});
	const property = /** @type {any} */ (ast.body[0]).declarations[0].id.properties[0];
	const { line, column } = comments[0].loc.start;
	property.loc = { start: { line, column: column - 1 }, end: property.loc.end };
	const { code } = print(ast, ts({ comments }));
	const { ast: reparsed } = acornParse(code, { fileExtension: 'js' });

	expect(/** @type {any} */ (reparsed.body[0]).declarations[0].id.properties[0].shorthand).toBe(
		true
	);
	expect(code).toContain('/** @type {object} */');
	expect(code).not.toContain('*/ (');
});

test('uses the configured quotes when expanding __proto__ shorthand', () => {
	const code = print_reanchored_shorthand('__proto__', ['* @type {object} '], 'double');

	expect(code).toContain('["__proto__"]:');
	expect_data_property(code, '__proto__');
});

test.each([
	'const result = { __proto__: __proto__ };',
	'const result = { __proto__: /** @type {object} */ (__proto__) };',
	'const result = { "__proto__": /** @type {object} */ (__proto__) };'
])('preserves an explicit prototype setter: %s', (input) => {
	const { ast, comments } = acornParse(input, { fileExtension: 'js' });
	const { code } = print(ast, ts({ comments }));
	const prototype = { marker: true };
	const result = new Function('__proto__', `${code}\nreturn result;`)(prototype);

	expect(Object.hasOwn(result, '__proto__')).toBe(false);
	expect(Object.getPrototypeOf(result)).toBe(prototype);
});
