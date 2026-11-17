// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
import { acornParse } from './common.js';

/** @param {unknown} ast */
function without_locations(ast) {
	return JSON.parse(
		JSON.stringify(ast, (key, value) =>
			['start', 'end', 'loc', 'raw'].includes(key) ? undefined : value
		)
	);
}

/**
 * @param {string} source
 * @param {number} index
 */
function position_at(source, index) {
	const lines = source.slice(0, index).split('\n');
	return [lines.length - 1, lines[lines.length - 1].length];
}

for (const [name, language] of /** @type {const} */ ([
	['ts', ts],
	['tsx', tsx]
])) {
	for (const with_tokens of [false, true]) {
		const label = `${name}, ${with_tokens ? 'with' : 'without'} tokens`;
		test.each([
			"import * as ns from 'module';",
			"import value, * as ns from 'module';",
			"import /* binding */ * as ns from 'module';",
			"import * as /* binding */ ns from 'module';",
			"import type * as ns from 'module';",
			"import value,\n\t* as // binding\n\tns from 'module';"
		])(`${label}: maps the binding identifiers in %s`, (source) => {
			/** @type {any[]} */
			const tokens = [];
			const { ast, comments } = acornParse(source, { fileExtension: 'ts', tokens });
			const { code, map } = print(ast, language({ comments }), {
				tokens: with_tokens ? tokens : undefined,
				sourceMapEncodeMappings: false
			});
			const mappings = /** @type {number[][][]} */ (map.mappings);

			for (const binding of source.includes('value') ? ['value', 'ns'] : ['ns']) {
				// Both ends of the name must map to the identifier, not the entire
				// namespace specifier (`* as ns`), even when comments shift the output.
				for (const offset of [0, binding.length]) {
					const [line, column] = position_at(code, code.indexOf(binding) + offset);
					const segment = mappings[line]?.find((segment) => segment[0] === column);

					expect(segment?.slice(2)).toEqual(position_at(source, source.indexOf(binding) + offset));
				}
			}
		});

		test.each([
			"import /* binding */ value from 'module';",
			"import /* binding */ * as ns from 'module';",
			"import * as /* binding */ ns from 'module';",
			"import value, /* binding */ * as ns from 'module';",
			"import /* binding */ value, { other } from 'module';",
			"import // binding\nvalue from 'module';",
			"import * as // binding\nns from 'module';",
			"import type /* binding */ T from 'module';",
			"import type /* binding */ * as ns from 'module';",
			"import /** @type {unknown} */ value from 'module';",
			"import /** @type {unknown} */ value, { other } from 'module';",
			"import /** @type {unknown} */ * as ns from 'module';",
			"import * as /** @type {unknown} */ ns from 'module';",
			"import value, /** @type {unknown} */ * as ns from 'module';",
			"import type /** @type {unknown} */ T from 'module';",
			"import type * as /** @type {unknown} */ ns from 'module';",
			"import /* default */ value, /* namespace */ * as /* binding */ ns from 'module';"
		])(`${label}: keeps leading binding comments in place in %s`, (source) => {
			/** @type {any[]} */
			const tokens = [];
			const { ast, comments } = acornParse(source, { fileExtension: 'ts', tokens });
			const { code } = print(ast, language({ comments }), {
				tokens: with_tokens ? tokens : undefined
			});

			// JSDoc comments already produce valid imports on main. The regression
			// is their placement: they must not move after `from` or into `{ ... }`.
			expect(code).toBe(source);
			const { ast: reparsed, comments: reparsed_comments } = acornParse(code, {
				fileExtension: 'ts'
			});
			expect(without_locations(reparsed)).toEqual(without_locations(ast));
			expect(
				print(reparsed, language({ comments: reparsed_comments }), {
					tokens: with_tokens ? tokens : undefined
				}).code
			).toBe(code);
		});

		test.each([
			"import /** @type {unknown} */ value from 'module';",
			"import * as /** @type {unknown} */ ns from 'module';"
		])(`${label}: does not change later expression printing after %s`, (source) => {
			/** @type {any[]} */
			const tokens = [];
			const { ast, comments } = acornParse(source, { fileExtension: 'ts', tokens });
			const declaration = ast.body[0];
			if (declaration.type !== 'ImportDeclaration') throw new Error('Expected an import');
			const local = declaration.specifiers[0].local;
			const options = { tokens: with_tokens ? tokens : undefined };
			const before = print(local, language({ comments }), options).code;

			print(ast, language({ comments }), options);

			// Import bindings are not casts, but visiting one must not globally mark
			// a reused identifier as a binding in subsequent expression printing.
			expect(before).toBe(`/** @type {unknown} */ (${local.name})`);
			expect(print(local, language({ comments }), options).code).toBe(before);
		});

		for (const target of ['specifier', 'local']) {
			test.each([
				"import value from 'module';",
				"import * as ns from 'module';",
				"import value, * as ns from 'module';",
				"import value, { other } from 'module';"
			])(
				`${label}: terminates additional trailing line comments on the ${target} in %s`,
				(source) => {
					/** @type {any[]} */
					const tokens = [];
					const { ast } = acornParse(source, { fileExtension: 'ts', tokens });
					const declaration = ast.body[0];
					if (declaration.type !== 'ImportDeclaration') throw new Error('Expected an import');
					const { code } = print(
						ast,
						language({
							getTrailingComments: (node) =>
								declaration.specifiers.some(
									(specifier) => node === (target === 'specifier' ? specifier : specifier.local)
								)
									? [{ type: 'Line', value: ' binding' }]
									: undefined
						}),
						{
							tokens: with_tokens ? tokens : undefined
						}
					);

					expect(code.match(/\/\/ binding\n/g)).toHaveLength(declaration.specifiers.length);
					const { ast: reparsed } = acornParse(code, { fileExtension: 'ts' });
					expect(without_locations(reparsed)).toEqual(without_locations(ast));
				}
			);
		}

		test.each([
			"import value from /* source */ 'module';",
			"import * as ns from /* source */ 'module';",
			"import value, * as ns from /* source */ 'module';",
			"import /* binding */ value from /* source */ 'module';",
			"import * as /* binding */ ns from /* source */ 'module';"
		])(`${label}: keeps source comments after from in %s`, (source) => {
			/** @type {any[]} */
			const tokens = [];
			const { ast, comments } = acornParse(source, { fileExtension: 'ts', tokens });
			const { code } = print(ast, language({ comments }), {
				tokens: with_tokens ? tokens : undefined
			});

			expect(code).toBe(source);
		});
	}
}
