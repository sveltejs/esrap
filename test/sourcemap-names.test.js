// @ts-check
/** @import { Visitors } from '../src/types.js' */
import { decode } from '@jridgewell/sourcemap-codec';
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

/** @typedef {number[]} Segment */

/**
 * @param {string} source
 * @param {{ tokens?: boolean, jsx?: boolean }} [opts]
 */
function mapped(source, opts = {}) {
	/** @type {any[]} */
	const tokens = [];
	const { ast, comments } = acornParse(source, {
		jsxMode: opts.jsx,
		fileExtension: opts.jsx ? 'tsx' : 'ts',
		tokens
	});
	const { code, map } = print(ast, (opts.jsx ? tsx : ts)({ comments }), {
		sourceMapEncodeMappings: false,
		tokens: opts.tokens === false ? undefined : tokens
	});
	const mappings = /** @type {Segment[][]} */ (/** @type {unknown} */ (map.mappings));
	return { code, names: /** @type {string[]} */ (map.names), mappings };
}

/**
 * The generated text, source text and name for every named segment
 * @param {{ code: string, names: string[], mappings: Segment[][] }} result
 * @param {string} source
 */
function named({ code, names, mappings }, source) {
	const generated_lines = code.split('\n');
	const source_lines = source.split('\n');

	return mappings.flatMap((line, i) =>
		line
			.filter((segment) => segment.length === 5)
			.map(([column, , original_line, original_column, name]) => ({
				name: names[name],
				generated: generated_lines[i].slice(column, column + names[name].length),
				original: source_lines[original_line].slice(
					original_column,
					original_column + names[name].length
				)
			}))
	);
}

test('identifiers are named with their original name', () => {
	const source = `import foo, * as ns from 'x';
import { bar as baz } from 'y';
export { baz as qux };
class A extends B {
	m(@dec x: number, y?: T) {
		return this.#p + obj.default + a?.b;
	}
	#p = 1;
}
const { a, b: [c] } = f(foo, ns);`;

	const result = mapped(source);
	const segments = named(result, source);

	for (const { name, generated, original } of segments) {
		expect(generated).toBe(name);
		expect(original).toBe(name);
	}

	expect(segments.map((s) => s.name)).toEqual([
		'foo',
		'ns',
		'bar',
		'baz',
		'baz',
		'qux',
		'A',
		'B',
		'm',
		'dec',
		'x',
		'y',
		'T',
		'obj',
		'default',
		'a',
		'b',
		'a',
		'b',
		'c',
		'f',
		'foo',
		'ns'
	]);
});

test('names are deduplicated', () => {
	const { names } = mapped(`let a = a + a;\na = b;`);
	expect(names).toEqual(['a', 'b']);
});

test('names are populated even if the output differs from the source', () => {
	const source = `let   a =\n\n\n    ( b );`;
	const result = mapped(source);
	expect(result.code).toBe('let a = b;');
	expect(named(result, source)).toEqual([
		{ name: 'a', generated: 'a', original: 'a' },
		{ name: 'b', generated: 'b', original: 'b' }
	]);
});

test('JSX identifiers are named', () => {
	const source = `const el = <Foo.Bar data-x={y}><div /></Foo.Bar>;`;
	const segments = named(mapped(source, { jsx: true }), source);

	for (const { name, generated, original } of segments) {
		expect(generated).toBe(name);
		expect(original).toBe(name);
	}

	expect(segments.map((s) => s.name)).toEqual([
		'el',
		'Foo',
		'Bar',
		'data-x',
		'y',
		'div',
		'Foo',
		'Bar'
	]);
});

test('names are empty without tokens', () => {
	const { names, mappings } = mapped(`let a = b;`, { tokens: false });
	expect(names).toEqual([]);
	expect(mappings.flat().every((segment) => segment.length === 4)).toBe(true);
});

test('encoded mappings include names', () => {
	/** @type {any[]} */
	const tokens = [];
	const { ast } = acornParse(`let a = b;`, { tokens });
	const { map } = print(ast, ts(), { tokens });

	expect(map.names).toEqual(['a', 'b']);
	expect(
		decode(map.mappings)
			.flat()
			.filter((segment) => segment.length === 5)
	).toEqual([
		[4, 0, 0, 4, 0],
		[8, 0, 0, 8, 1]
	]);
});

/**
 * @param {Visitors<any>} visitors
 * @param {any[]} tokens
 */
function custom(visitors, tokens) {
	const { map } = print({ type: 'Root' }, visitors, { tokens, sourceMapEncodeMappings: false });
	return { names: map.names, mappings: /** @type {Segment[][]} */ (map.mappings) };
}

const custom_tokens = [
	{
		type: 'Identifier',
		value: 'foo',
		loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } }
	},
	{
		type: 'Identifier',
		value: 'bar',
		loc: { start: { line: 1, column: 4 }, end: { line: 1, column: 7 } }
	}
];

test('a location mapped without a name gains one when mapped again with a name', () => {
	const result = custom(
		{
			Root(node, context) {
				context.location(1, 0);
				context.location(1, 0, true);
				context.write('foo');
			}
		},
		custom_tokens
	);

	expect(result.names).toEqual(['foo']);
	expect(result.mappings).toEqual([[[0, 0, 0, 0, 0]]]);
});

test('a location keeps its first name when mapped again', () => {
	const result = custom(
		{
			Root(node, context) {
				context.location(1, 0, true);
				context.location(1, 0);
				context.location(1, 0, true);
				context.write('foo');
			}
		},
		custom_tokens
	);

	expect(result.names).toEqual(['foo']);
	expect(result.mappings).toEqual([[[0, 0, 0, 0, 0]]]);
});

test('a location without a token has no name', () => {
	const result = custom(
		{
			Root(node, context) {
				context.location(1, 1, true);
				context.write('x');
			}
		},
		custom_tokens
	);

	expect(result.names).toEqual([]);
	expect(result.mappings).toEqual([[[0, 0, 0, 1]]]);
});

test('a name is added after pending whitespace', () => {
	const result = custom(
		{
			Root(node, context) {
				context.write('x');
				context.space();
				context.location(1, 4, true);
				context.write('bar');
			}
		},
		custom_tokens
	);

	expect(result.names).toEqual(['bar']);
	expect(result.mappings).toEqual([[[2, 0, 0, 4, 0]]]);
});
