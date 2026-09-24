// @ts-check
import { expect, test } from 'vitest';
import { ModuleKind, transpile } from 'typescript';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse, oxcParse } from './common.js';

for (const parse of [acornParse, oxcParse]) {
	test(`${parse.name} preserves an empty type-only import`, () => {
		const source = 'import type {} from "x";';
		const { code } = print(parse(source).ast, ts());
		expect(code).toBe(source);
		expect(parse(code).ast.body[0]).toMatchObject({
			type: 'ImportDeclaration',
			importKind: 'type',
			specifiers: []
		});
		expect(transpile(code, { module: ModuleKind.ESNext })).not.toContain('"x"');
	});

	test(`${parse.name} preserves a side-effect import`, () => {
		const source = 'import "x";';
		const { code } = print(parse(source).ast, ts());
		expect(code).toBe(source);
		expect(transpile(code, { module: ModuleKind.ESNext })).toContain(source);
	});
}
