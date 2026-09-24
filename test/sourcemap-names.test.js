// @ts-check
import { decode } from '@jridgewell/sourcemap-codec';
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

test('named mappings survive encoding and serialization', () => {
	const source = 'const value = other;\nvalue(other);';
	const { ast } = acornParse(source);
	const { map } = print(ast, ts());
	const { map: decoded } = print(ast, ts(), { sourceMapEncodeMappings: false });

	expect(decode(map.mappings)).toEqual(decoded.mappings);
	expect(map.names).toEqual(decoded.names);
	expect(JSON.parse(map.toString())).toEqual({ ...map });
	expect(JSON.parse(Buffer.from(map.toUrl().split(',')[1], 'base64').toString())).toEqual({
		...map
	});
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
