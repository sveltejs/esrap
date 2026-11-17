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
 * @param {string} input
 * @param {string} [fileExtension]
 */
function roundtrip(input, fileExtension = 'js') {
	const { ast, comments } = acornParse(input, { fileExtension });
	const { code } = print(ast, ts({ comments }));
	const { ast: reparsed } = acornParse(code, { fileExtension });

	// Parsing alone isn't enough: parentheses can turn a static import into a
	// dynamic import, an optional property access into a call, or a tag into a call.
	expect(without_locations(reparsed)).toEqual(without_locations(ast));
	return code;
}

test.each([
	['a class declaration name', 'class /** @type {any} */ C {}', 'js'],
	['a class expression name', 'const C = class /** @type {any} */ Named {};', 'js'],
	['a break label', 'outer: while (true) { break /** @type {any} */ outer; }', 'js'],
	['a continue label', 'outer: while (true) { continue /** @type {any} */ outer; }', 'js'],
	['a property name', 'const x = obj./** @type {any} */ prop;', 'js'],
	['an optional property name', 'const x = obj?./** @type {any} */ prop;', 'js'],
	['a meta property name', 'const x = import./** @type {any} */ meta;', 'js'],
	['a getter name', 'const x = { get /** @type {any} */ value() {} };', 'js'],
	['an async method name', 'const x = { async /** @type {any} */ method() {} };', 'js'],
	['a generator method name', 'class C { * /** @type {any} */ method() {} }', 'js'],
	['a static field name', 'class C { static /** @type {any} */ field; }', 'js'],
	['a side-effect import source', 'import /** @type {any} */ "mod";', 'js'],
	['a named import source', 'import value from /** @type {any} */ "mod";', 'js'],
	['an import alias', 'import { value as /** @type {any} */ local } from "mod";', 'js'],
	['an export alias', 'const value = 1; export { value as /** @type {any} */ renamed };', 'js'],
	['an export source', 'export { value } from /** @type {any} */ "mod";', 'js'],
	['an export namespace', 'export * as /** @type {any} */ ns from "mod";', 'js'],
	['an import attribute value', 'import "mod" with { type: /** @type {any} */ "json" };', 'js'],
	['an array assignment pattern', '({ key: /** @type {any} */ [value] } = obj);', 'js'],
	['an object assignment pattern', '({ key: /** @type {any} */ { value } } = obj);', 'js'],
	['an assignment rest element', '({ key: [/** @type {any} */ ...rest] } = obj);', 'js'],
	['a for-of assignment pattern', 'for (/** @type {any} */ [value] of values) {}', 'js'],
	['a for-in assignment pattern', 'for (/** @type {any} */ { value } in values) {}', 'js'],
	['a tagged template', 'const x = tag /** @type {any} */ `text`;', 'js'],
	['a type alias name', 'type /** @type {any} */ T = string;', 'ts'],
	['a type query name', 'type T = typeof /** @type {any} */ value;', 'ts'],
	['a qualified type name', 'type T = ns./** @type {any} */ Value;', 'ts'],
	['a type import source', 'type T = import(/** @type {any} */ "mod").Value;', 'ts'],
	['an enum name', 'enum /** @type {any} */ E { Value }', 'ts'],
	['an enum member name', 'enum E { /** @type {any} */ Value }', 'ts'],
	['a namespace name', 'namespace /** @type {any} */ N {}', 'ts'],
	['an interface name', 'interface /** @type {any} */ I {}', 'ts'],
	['an interface base name', 'interface I extends /** @type {any} */ Base {}', 'ts'],
	['an implemented type name', 'class C implements /** @type {any} */ Base {}', 'ts'],
	['a type predicate parameter', 'function f(x: unknown): x is /** @type {any} */ Value {}', 'ts'],
	['a named tuple label', 'type T = [/** @type {any} */ label: string];', 'ts'],
	['an optional tuple label', 'type T = [/** @type {any} */ label?: string];', 'ts'],
	['a readonly property name', 'interface I { readonly /** @type {any} */ value: string }', 'ts']
])('JSDoc @type on %s is not a cast', (_, input, fileExtension) => {
	const code = roundtrip(input, fileExtension);

	expect(code).toContain('/** @type {any} */');
	expect(code).not.toContain('*/ (');
});

test.each([
	['an initializer', 'const x = /** @type {any} */ (value);', 'js'],
	['a parameter default', 'function f(value = /** @type {any} */ (other)) {}', 'js'],
	['a destructuring default', 'const { key: value = /** @type {any} */ (other) } = obj;', 'js'],
	['a computed member', 'const x = obj[/** @type {any} */ (key)];', 'js'],
	['an optional computed member', 'const x = obj?.[/** @type {any} */ (key)];', 'js'],
	['a computed property', 'const x = { [/** @type {any} */ (key)]: value };', 'js'],
	['a computed method', 'class C { [/** @type {any} */ (key)]() {} }', 'js'],
	['a dynamic import source', 'const x = import(/** @type {any} */ (source));', 'js'],
	['an enum initializer', 'enum E { Value = /** @type {any} */ (value) }', 'ts'],
	['a type assertion operand', 'const x = <any>/** @type {any} */ (value);', 'ts'],
	['a computed signature key', 'interface I { [/** @type {any} */ (key)]: string }', 'ts'],
	['a grouped optional chain', 'const x = (/** @type {any} */ (obj?.a)).b;', 'js'],
	['a grouped optional callee', 'const x = (/** @type {any} */ (obj?.m))();', 'js'],
	['an optional call argument', 'const x = obj?.m(/** @type {any} */ (arg));', 'js'],
	['an update target', '++/** @type {any} */ (value);', 'js'],
	['an assignment target', '({ key: /** @type {any} */ (value) } = obj);', 'js']
])('preserves a JSDoc type cast on %s', (_, input, fileExtension) => {
	expect(roundtrip(input, fileExtension)).toContain('/** @type {any} */ (');
});

test.each([
	'const obj = { value: /** @type {any} */ (value) };',
	'({ value: /** @type {any} */ (value) } = obj);'
])('does not turn a cast property value into shorthand: %s', (input) => {
	expect(roundtrip(input)).toBe(input);
});

test.each([
	{ name: 'ts', language: ts },
	{ name: 'tsx', language: tsx }
])('preserves the key for a cast on a destructuring default target ($name)', ({ language }) => {
	const input = '({ x: (/** @type {number} */ (x)) = 1 } = source);';
	const { ast, comments } = acornParse(input, { fileExtension: 'js' });
	const { code } = print(ast, language({ comments }));

	expect(code).toBe('({ x: /** @type {number} */ (x) = 1 } = source);');
	const { ast: reparsed } = acornParse(code, { fileExtension: 'js' });
	expect(without_locations(reparsed)).toEqual(without_locations(ast));
});

// Regressions for the workarounds in
// https://github.com/sveltia/sveltia-cms/commit/6dcfa93ef38f01271e3b4f3fcbef9f6aa88dabc3
test.each([
	[
		'await render(AccountMenu, { menuButton: /** @type {any} */ (menuButton) });',
		'menuButton: /** @type {any} */ (menuButton)'
	],
	[
		'subfolderPaths.map((path) => getFolderPublicPath({ folder: /** @type {AssetFolderInfo} */ (folder), subfolderPath: path }));',
		'folder: /** @type {AssetFolderInfo} */ (folder)'
	],
	[
		'auth.magicLinkConfirmation = { account: /** @type {User} */ (account), resolve };',
		'account: /** @type {User} */ (account)'
	]
])('preserves the cast property value without the Sveltia workaround: %s', (input, property) => {
	expect(roundtrip(input)).toContain(property);
});

test.each(['/* * @type {any} */', '/*\n * @type {any}\n */'])(
	'ignores @type in a non-JSDoc comment: %s',
	(comment) => {
		const code = roundtrip(`const x = ${comment} value;`);
		expect(code).not.toContain('(');
	}
);
