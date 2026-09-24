// @ts-check
import { decode } from '@jridgewell/sourcemap-codec';
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

test.each([false, true])('records deduplicated identifier names (encoded: %s)', (encode) => {
	const source = 'const value = other;\nvalue(other);';
	const { ast } = acornParse(source);
	const { code, map } = print(ast, ts(), { sourceMapEncodeMappings: encode });
	const mappings = encode ? decode(map.mappings) : map.mappings;

	expect(code).toBe('const value = other;\n\nvalue(other);');
	expect(map.names).toEqual(['value', 'other']);
	expect(
		mappings.map((/** @type {number[][]} */ line) => line.filter((s) => s.length === 5))
	).toEqual([
		[
			[6, 0, 0, 6, 0],
			[14, 0, 0, 14, 1]
		],
		[],
		[
			[0, 0, 1, 0, 0],
			[6, 0, 1, 6, 1]
		]
	]);
	expect(JSON.parse(map.toString()).names).toEqual(map.names);
	expect(JSON.parse(Buffer.from(map.toUrl().split(',')[1], 'base64').toString()).names).toEqual(
		map.names
	);
});

test('keeps original names when identifiers are renamed', () => {
	const { ast } = acornParse('original;');
	const identifier = /** @type {any} */ (ast.body[0]).expression;
	identifier.loc.identifierName = identifier.name;
	identifier.name = 'renamed';

	const { code, map } = print(ast, ts(), { sourceMapEncodeMappings: false });
	expect(code).toBe('renamed;');
	expect(map.names).toEqual(['original']);
	expect(map.mappings[0][0]).toEqual([0, 0, 0, 0, 0]);
});

test('maps default and namespace import names at their identifiers', () => {
	const source = 'import local, * as namespace from "x";';
	const { ast } = acornParse(source);
	const { code, map } = print(ast, ts(), { sourceMapEncodeMappings: false });
	expect(code).toBe(source);
	expect(map.names).toEqual(['local', 'namespace']);
	for (const name of map.names) {
		const column = code.indexOf(name);
		expect(map.mappings[0]).toContainEqual([column, 0, 0, column, map.names.indexOf(name)]);
	}
});

test('maps JSX identifiers and TypeScript type names', () => {
	const { ast } = acornParse('const element: Element = <Component prop={value} />;', {
		jsxMode: true
	});
	const { map } = print(ast, tsx());
	expect(map.names).toEqual(['element', 'Element', 'Component', 'prop', 'value']);
});

test('only includes names with source locations', () => {
	const ast = { type: 'Identifier', name: 'generated' };
	expect(print(ast, ts()).map.names).toEqual([]);
	expect(print(acornParse('42;').ast, ts()).map.names).toEqual([]);
});

test('custom printers can attach names to locations in child contexts', () => {
	const { code, map } = print(
		{ type: 'Custom' },
		{
			Custom(node, context) {
				context.write('{');
				context.indent();
				context.newline();
				const child = context.new();
				child.location(2, 4);
				child.location(2, 4, 'original');
				child.location(2, 4);
				child.write('renamed');
				context.append(child);
				context.dedent();
				context.newline();
				context.write('}');
			}
		},
		{ sourceMapEncodeMappings: false }
	);
	expect(code).toBe('{\n\trenamed\n}');
	expect(map.names).toEqual(['original']);
	expect(map.mappings[1]).toEqual([[1, 0, 1, 4, 0]]);
});
