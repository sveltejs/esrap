// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

for (const [name, language] of /** @type {const} */ ([
	['ts', ts],
	['tsx', tsx]
])) {
	for (const with_tokens of [false, true]) {
		const label = `${name}, ${with_tokens ? 'with' : 'without'} tokens`;
		test(`${label}: maps the namespace binding identifier`, () => {
			const source = "import * as ns from 'module';";
			/** @type {any[]} */
			const tokens = [];
			const { ast } = acornParse(source, { fileExtension: 'ts', tokens });
			const { code, map } = print(ast, language(), {
				tokens: with_tokens ? tokens : undefined,
				sourceMapEncodeMappings: false
			});
			const mappings = /** @type {number[][][]} */ (map.mappings);
			const segment = mappings[0].find((segment) => segment[0] === code.indexOf('ns'));

			expect(segment?.slice(2)).toEqual([0, source.indexOf('ns')]);
		});

		test.each([
			["import /* binding */ value from 'module';", 'import /* binding */ value'],
			["import /* binding */ * as ns from 'module';", 'import /* binding */ * as ns'],
			["import * as /* binding */ ns from 'module';", '* as /* binding */ ns'],
			["import value, /* binding */ * as ns from 'module';", ', /* binding */ * as ns'],
			["import /* binding */ value, { other } from 'module';", 'import /* binding */ value,'],
			["import // binding\nvalue from 'module';", 'import // binding\nvalue'],
			["import type /* binding */ T from 'module';", 'import type /* binding */ T'],
			["import /** @type {unknown} */ value from 'module';", 'import /** @type {unknown} */ value'],
			["import * as /** @type {unknown} */ ns from 'module';", '* as /** @type {unknown} */ ns']
		])(`${label}: preserves the binding comment in %s`, (source, expected) => {
			/** @type {any[]} */
			const tokens = [];
			const { ast, comments } = acornParse(source, { fileExtension: 'ts', tokens });
			const { code } = print(ast, language({ comments }), {
				tokens: with_tokens ? tokens : undefined
			});

			expect(code).toContain(expected);
			expect(() => acornParse(code, { fileExtension: 'ts' })).not.toThrow();
		});

		test.each([
			"import value from /* source */ 'module';",
			"import * as ns from /* source */ 'module';"
		])(`${label}: keeps source comments after from in %s`, (source) => {
			/** @type {any[]} */
			const tokens = [];
			const { ast, comments } = acornParse(source, { fileExtension: 'ts', tokens });
			const { code } = print(ast, language({ comments }), {
				tokens: with_tokens ? tokens : undefined
			});

			expect(code).toContain("from /* source */ 'module'");
		});
	}
}
