// @ts-check
import { expect, test } from 'vitest';
import ts from '../src/languages/ts/index.js';
import { print } from '../src/index.js';
import { acornParse } from './common.js';

/**
 * @param {string} code
 * @param {number} index
 */
function generatedLineColumn(code, index) {
	const before = code.slice(0, index);
	const nl = [...before.matchAll(/\n/g)];
	const gen_line = nl.length;
	const gen_col = before.length - (before.lastIndexOf('\n') + 1);
	return { gen_line, gen_col };
}

/**
 * @param {string} code
 * @param {string} needle
 * @param {[number, number, number, number][][]} mappings
 * @returns {[number, number, number, number]}
 */
function mappingAtSubstring(code, needle, mappings) {
	const idx = code.indexOf(needle);
	expect(idx >= 0, `needle not in output: ${JSON.stringify(needle)}`).toBe(true);
	const { gen_line, gen_col } = generatedLineColumn(code, idx);
	const line = mappings[gen_line];
	expect(line).toBeDefined();
	const line_segments = /** @type {[number, number, number, number][]} */ (line);

	const segment = line_segments.find((s) => s[0] === gen_col);
	expect(segment).toBeDefined();
	return /** @type {[number, number, number, number]} */ (segment);
}

/**
 * @param {string} source
 * @param {{ preserveParens?: boolean }} [opts]
 */
function mapped(source, opts = {}) {
	const { ast, comments } = acornParse(source, {
		preserveParens: opts.preserveParens,
		sourceType: 'module',
		jsxMode: false,
		fileExtension: 'ts'
	});
	const { code, map } = print(ast, ts({ comments }), {
		sourceMapSource: 'input.ts',
		sourceMapContent: source,
		sourceMapEncodeMappings: false
	});
	expect(map.mappings).toBeTruthy();
	const mappings = /** @type {[number, number, number, number][][]} */ (
		/** @type {unknown} */ (map.mappings)
	);
	return { source, code, mappings };
}

test.each([
	['function f() {\n\tthrow new /* comment */\nError("x");\n}', 'new'],
	['async function f() {\n\tawait /* comment */\nvalue;\n}', 'await'],
	['async function f() {\n\tawait (a || b);\n}', 'await'],
	['function* f() {\n\tyield /* comment */ *\nvalues;\n}', 'yield'],
	['function* f() {\n\tyield;\n}', 'yield'],
	['const p =\n\timport /* comment */\n("foo");', 'import']
])('maps runtime expression starts: %s', (source, keyword) => {
	const { code, mappings } = mapped(source);
	const segment = mappingAtSubstring(code, keyword, mappings);
	const { gen_line, gen_col } = generatedLineColumn(source, source.indexOf(keyword));
	expect(segment.slice(2)).toEqual([gen_line, gen_col]);
});

test.each([
	['typed parameter', `function f(id: string) {}`, 'id'],
	['optional parameter', `function f(id?: string) {}`, 'id'],
	['typed declaration', `let x: number = 1;`, 'x'],
	['definite declaration', `let x!: number;`, 'x'],
	['untyped name', `let x = 1;`, 'x']
])('the end of a typed name maps to the end of the name: %s', (_name, source, name) => {
	const { code, mappings } = mapped(source);
	const index = code.indexOf(name) + name.length;
	const { gen_line, gen_col } = generatedLineColumn(code, index);
	const at_end = (mappings[gen_line] ?? []).filter((s) => s[0] === gen_col).map((s) => s.slice(2));
	expect(at_end).toContainEqual([0, source.indexOf(name) + name.length]);
	expect(at_end).not.toContainEqual([0, source.indexOf(name) + name.length + 1]);
});

test.each([
	['switch (n) {\n\tcase 1:\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', 'case'],
	['switch (n) {\n\tcase 1:\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', 'default'],
	['try {\n\tf();\n} catch (e) {\n\tg(e);\n}', 'catch'],
	['try {\n\tf();\n} catch {\n\tg();\n}', 'catch'],
	['for (const k in o) {\n\tf(k);\n}', 'const k'],
	['for (let i = 0; i < n; i++) {\n\tf(i);\n}', 'let i'],
	['for await (const v of s) {\n\tf(v);\n}', 'const v'],
	['class A {\n\tm(@dec x: number) {}\n}', '@dec']
])('maps the start of nodes printed inline: %s', (source, needle) => {
	const { code, mappings } = mapped(source);
	const segment = mappingAtSubstring(code, needle, mappings);
	const { gen_line, gen_col } = generatedLineColumn(source, source.indexOf(needle));
	expect(segment.slice(2)).toEqual([gen_line, gen_col]);
});

/**
 * @param {string} code
 * @param {number} index
 * @param {[number, number, number, number][][]} mappings
 */
function mappingsAtIndex(code, index, mappings) {
	const { gen_line, gen_col } = generatedLineColumn(code, index);
	const line = mappings[gen_line] ?? [];
	return line.filter((segment) => segment[0] === gen_col);
}

/**
 * @param {string} code
 * @param {string} needle
 * @param {[number, number, number, number][][]} mappings
 */
function sourcePositionsAt(code, needle, mappings) {
	const index = code.indexOf(needle);
	expect(index >= 0, `needle not in output: ${JSON.stringify(needle)}`).toBe(true);
	const { gen_line, gen_col } = generatedLineColumn(code, index);
	return (mappings[gen_line] ?? []).filter((s) => s[0] === gen_col).map((s) => s.slice(2));
}

test.each([
	['class heritage', `class B extends function () {} {}`, '(function', 'function'],
	['call of a dropped parenthesized expression', `(a || b)();`, '(a', 'a'],
	['await argument', `async function f() {\n\tawait (x || y);\n}`, '(x', 'x'],
	['decorator expression', `@(a || b)\nclass C {}`, '(a', 'a']
])(
	'parentheses and braces added by the printer map to what they wrap: %s',
	(_name, source, needle, wrapped) => {
		const { code, mappings } = mapped(source);
		const { gen_line, gen_col } = generatedLineColumn(source, source.indexOf(wrapped));
		expect(sourcePositionsAt(code, needle, mappings)).toContainEqual([gen_line, gen_col]);
	}
);

function mappingsAtSubstring(code, needle, mappings) {
	const index = code.indexOf(needle);
	expect(index >= 0, `needle not in output: ${JSON.stringify(needle)}`).toBe(true);
	return mappingsAtIndex(code, index, mappings);
}

/**
 * Prints `source` with the parser's tokens passed to the printer (or `opts.tokens`)
 * @param {string} source
 * @param {{ tokens?: boolean | any[], sourceType?: 'module' | 'script' }} [opts]
 */
function mappedWithTokens(source, opts = {}) {
	/** @type {any[]} */
	const tokens = [];
	const { ast, comments } = acornParse(source, {
		sourceType: opts.sourceType ?? 'module',
		jsxMode: false,
		fileExtension: 'ts',
		tokens
	});
	const { code, map } = print(
		ast,
		ts({ comments, tokens: opts.tokens === true ? tokens : opts.tokens || undefined }),
		{ sourceMapSource: 'input.ts', sourceMapContent: source, sourceMapEncodeMappings: false }
	);
	const mappings = /** @type {[number, number, number, number][][]} */ (
		/** @type {unknown} */ (map.mappings)
	);
	return { code, mappings, tokens };
}

/**
 * Every `delimiters` character in the output maps to the matching token in the
 * source, and the output is the same as without tokens.
 * @param {string} source
 * @param {string[]} delimiters
 * @param {{ sourceType?: 'module' | 'script' }} [opts]
 */
function expectExactDelimiterMappings(source, delimiters, opts = {}) {
	const without = mappedWithTokens(source, { sourceType: opts.sourceType });
	const { code, mappings, tokens } = mappedWithTokens(source, {
		tokens: true,
		sourceType: opts.sourceType
	});
	expect(code).toBe(without.code);

	// a backtracking parser can emit a token twice
	const seen = new Set();
	/** @type {{ value: string, start: { line: number, column: number } }[]} */
	const source_delimiters = [];
	for (const token of tokens) {
		const value = token.type.label;
		if (!token.loc || !delimiters.includes(value === '${' ? '{' : value)) continue;
		const key = `${value}:${token.loc.start.line}:${token.loc.start.column}`;
		if (seen.has(key)) continue;
		seen.add(key);
		source_delimiters.push({ value, start: token.loc.start });
	}

	/** @type {{ value: string, index: number }[]} */
	const generated_delimiters = [];
	for (let i = 0; i < code.length; i += 1) {
		if (code[i] === '$' && code[i + 1] === '{' && delimiters.includes('{')) {
			generated_delimiters.push({ value: '${', index: i });
			i += 1;
		} else if (delimiters.includes(code[i])) {
			generated_delimiters.push({ value: code[i], index: i });
		}
	}

	expect(generated_delimiters.map((d) => d.value)).toEqual(source_delimiters.map((d) => d.value));
	for (let i = 0; i < generated_delimiters.length; i += 1) {
		const { start } = source_delimiters[i];
		expect(
			mappingsAtIndex(code, generated_delimiters[i].index, mappings).map((s) => s.slice(2)),
			`${generated_delimiters[i].value} at ${start.line}:${start.column}`
		).toContainEqual([start.line - 1, start.column]);
	}
}

test.each([
	['object property', `const object = { [\nkey\n]: value };`],
	['object method', `const object = { async *[\nmethod\n]() {} };`],
	['object getter', `const object = { get [\nkey\n]() { return 1; } };`],
	['object setter', `const object = { set [\nkey\n](value) {} };`],
	['class method', `class Example { [\nmethod\n]() {} }`],
	['class field', `class Example { [\nfield\n] = 1; }`],
	['type property signature', `type Example = { [\nkey\n]: string }`],
	['type method signature', `type Example = { [\nmethod\n](): void }`],
	['comments inside the brackets', `const object = { [ /* before */\nkey\n/* after */ ]: value };`],
	['array expression', `const values = [ /* before */\nvalue\n/* after */ ];`],
	['array pattern', `const [ /* before */\nvalue\n/* after */ ] = values;`],
	['computed member access', `const value = object[ /* before */\nkey\n/* after */ ];`],
	['array type', `type Values = Item /* before */ [ /* after */ ];`],
	['index signature', `type Dictionary = { [ /* before */ key: string /* after */ ]: number };`],
	['readonly index signature', `type Dictionary = { readonly [ key: string ]: number };`],
	[
		'mapped type',
		`type Selected = { [ /* before */ K in Keys as Rename<K> /* after */ ]: string };`
	],
	['tuple type', `type Pair = [ /* before */ First, Second /* after */ ];`],
	['indexed access type', `type Value = Object[ /* before */ Key /* after */ ];`]
])('tokens map square brackets for %s', (_name, source) => {
	expectExactDelimiterMappings(source, ['[', ']']);
});

test.each([
	['call', `const result = fn /* before */ ( /* inside */ value /* after */ );`, {}],
	[
		'new expression',
		`const result = new Thing /* before */ ( /* inside */ value /* after */ );`,
		{}
	],
	[
		'function declaration',
		`function example /* before */ ( /* inside */ value /* after */ ) {}`,
		{}
	],
	['async arrow function', `const fn = async /* before */ ( value ) => value;`, {}],
	['arrow function', `const callback = ( /* before */ value /* after */ ) => value;`, {}],
	['empty arrow function', `const callback = /* before */ () => value;`, {}],
	['class method', `class Example { method /* before */ ( value /* after */ ) {} }`, {}],
	['object method', `const object = { method /* before */ ( value /* after */ ) {} };`, {}],
	['nested method delimiters', `class Example { [getKey()] /* before */ (value = make()) {} }`, {}],
	['nested parameter delimiters', `function example(value = make(1)) {}`, {}],
	[
		'trailing comma on its own line',
		`function example(\n\tfirst: number,\n\tsecond: string,\n) {}`,
		{}
	],
	['call signature', `type Example = { ( /* before */ value: string /* after */ ): void };`, {}],
	[
		'construct signature',
		`type Example = { new ( /* before */ value: string /* after */ ): object };`,
		{}
	],
	['function type', `type Example = ( /* before */ value: string /* after */ ) => void;`, {}],
	[
		'constructor type',
		`type Example = new ( /* before */ value: string /* after */ ) => object;`,
		{}
	],
	[
		'method signature',
		`type Example = { method( /* before */ value: string /* after */ ): void };`,
		{}
	],
	[
		'declare function',
		`declare function example( /* before */ value: string /* after */ ): void;`,
		{}
	],
	['for statement', `for /* before */ (let i = 0; i < 1; i += 1) {}`, {}],
	['for-of statement', `for /* before */ (const value of values) {}`, {}],
	['if statement', `if /* before */ (condition /* after */) {}`, {}],
	['while statement', `while /* before */ (condition /* after */) {}`, {}],
	['do-while statement', `do {} while /* before */ (condition /* after */);`, {}],
	['with statement', `with /* before */ (object /* after */) {}`, { sourceType: 'script' }],
	['switch statement', `switch /* before */ (value /* after */) { default: break; }`, {}],
	['catch clause', `try {} catch /* before */ (error /* after */) {}`, {}],
	['import expression', `const module = import( /* before */ 'module' /* after */ );`, {}],
	['external module reference', `import Alias = require( /* before */ 'module' /* after */ );`, {}],
	['import type', `type Value = import( /* before */ 'module' /* after */ ).Value;`, {}]
])('tokens map parentheses for %s', (_name, source, opts) => {
	expectExactDelimiterMappings(source, ['(', ')'], {
		sourceType: 'sourceType' in opts && opts.sourceType === 'script' ? 'script' : undefined
	});
});

test.each([
	['named import', `import { /* before */ value /* after */ } from 'module';`],
	['named export', `const value = 1;\nexport { /* before */ value /* after */ };`],
	['empty named export', `export { /* inside */ };`],
	['import attributes', `import value from 'module' with { type: 'json' };`],
	['static block', `class Example { static /* before */ { value; } }`],
	['switch body', `switch (value) /* before */ { default: break; }`],
	['enum body', `enum Example /* before */ { Value }`],
	['interface body', `interface Example /* before */ { value: string }`],
	['namespace body', `namespace Example /* before */ { export const value = 1; }`],
	['template interpolation', 'const result = `before ${ /* before */ value /* after */ } after`;'],
	['template-literal type interpolation', 'type Result = `before ${Value} after`;']
])('tokens map curly braces for %s', (_name, source) => {
	expectExactDelimiterMappings(source, ['{', '}']);
});

test('control-flow parentheses are the outer authored ones', () => {
	const source = `if /* before */ ((condition)) {}`;
	const { code, mappings, tokens } = mappedWithTokens(source, { tokens: true });
	const opens = tokens.filter((token) => token.type.label === '(');
	const closes = tokens.filter((token) => token.type.label === ')');

	expect(mappingsAtSubstring(code, '(', mappings).map((s) => s.slice(2))).toContainEqual([
		opens[0].loc.start.line - 1,
		opens[0].loc.start.column
	]);
	expect(mappingsAtSubstring(code, ')', mappings).map((s) => s.slice(2))).toContainEqual([
		closes[closes.length - 1].loc.start.line - 1,
		closes[closes.length - 1].loc.start.column
	]);
});

test('delimiters inside a node are left unmapped without tokens', () => {
	const source = `const object = { [ key ]: value };`;
	const { code, mappings } = mappedWithTokens(source);
	expect(mappingsAtSubstring(code, ']', mappings).map((s) => s.slice(2))).not.toContainEqual([
		0,
		source.indexOf(']')
	]);
});

test('closing delimiters at a node end are mapped without tokens', () => {
	const source = `const value = object[key];`;
	const { code, mappings } = mappedWithTokens(source);
	expect(mappingsAtSubstring(code, ']', mappings).map((s) => s.slice(2))).toContainEqual([
		0,
		source.indexOf(']')
	]);
});

test('tokens without locations leave mappings unchanged', () => {
	const source = `const object = { [key]: fn(value) };`;
	const { mappings, tokens } = mappedWithTokens(source);
	const bare = tokens.map(({ type, value }) => ({ type, value }));
	expect(mappedWithTokens(source, { tokens: bare }).mappings).toEqual(mappings);
	expect(mappedWithTokens(source, { tokens: [] }).mappings).toEqual(mappings);
});

test('tokens out of source order still locate delimiters', () => {
	// acorn-typescript backtracks and re-emits tokens, so its stream is not monotone
	const source = `const object = { [ key ]: fn( value ) };`;
	const { mappings, tokens } = mappedWithTokens(source, { tokens: true });
	const reversed = [...tokens].reverse();
	expect(mappedWithTokens(source, { tokens: reversed }).mappings).toEqual(mappings);
});

test('ESLint-style tokens locate delimiters and keywords', () => {
	const source = `const object = { [ key ]: fn( value ) };\nasync /* c */ function f() {}`;
	const { mappings, tokens } = mappedWithTokens(source, { tokens: true });
	const eslint_style = tokens.map((token) => ({
		type: token.type.keyword
			? 'Keyword'
			: token.type.label === 'name'
				? 'Identifier'
				: 'Punctuator',
		value: token.type.label === 'name' || token.type.keyword ? token.value : token.type.label,
		loc: token.loc
	}));
	expect(mappedWithTokens(source, { tokens: eslint_style }).mappings).toEqual(mappings);
});

/**
 * Every `words` keyword in the output maps to the matching token in the source,
 * and the output is the same as without tokens.
 * @param {string} source
 * @param {string[]} words
 */
function expectExactKeywordMappings(source, words) {
	const without = mappedWithTokens(source);
	const { code, mappings, tokens } = mappedWithTokens(source, { tokens: true });
	expect(code).toBe(without.code);

	const seen = new Set();
	/** @type {{ value: string, start: { line: number, column: number } }[]} */
	const source_words = [];
	for (const token of tokens) {
		const value = token.type.label === 'name' ? token.value : token.type.label;
		if (!token.loc || !words.includes(value)) continue;
		const key = `${token.loc.start.line}:${token.loc.start.column}`;
		if (seen.has(key)) continue;
		seen.add(key);
		source_words.push({ value, start: token.loc.start });
	}

	const pattern = new RegExp(`\\b(${words.join('|')})\\b`, 'g');
	const generated_words = [...code.matchAll(pattern)].map((m) => ({
		value: m[0],
		index: /** @type {number} */ (m.index)
	}));

	expect(generated_words.map((w) => w.value)).toEqual(source_words.map((w) => w.value));
	for (let i = 0; i < generated_words.length; i += 1) {
		const { start } = source_words[i];
		expect(
			mappingsAtIndex(code, generated_words[i].index, mappings).map((s) => s.slice(2)),
			`${generated_words[i].value} at ${start.line}:${start.column}`
		).toContainEqual([start.line - 1, start.column]);
	}
}

test.each([
	['async function', `async /* c */ function f() {}`, ['async', 'function']],
	['async generator', `async /* c */ function* f() {}`, ['async', 'function']],
	['function expression', `const f = async /* c */ function () {};`, ['async', 'function']],
	['async arrow', `const f = async /* c */ ( x ) => x;`, ['async']],
	['declare function', `declare /* c */ function f(): void;`, ['declare', 'function']],
	[
		'class modifiers',
		`declare /* c */ abstract /* c */ class K {}`,
		['declare', 'abstract', 'class']
	],
	['decorated class', `@dec /* c */ class K {}`, ['class']],
	['export default class', `export /* c */ default /* c */ class {}`, ['default', 'class']],
	[
		'class heritage',
		`class K extends /* c */ B implements /* c */ I {}`,
		['extends', 'implements']
	],
	[
		'member modifiers',
		`class K extends B {\n\tstatic /* c */ async /* c */ *m() {}\n\tprivate /* c */ readonly p = 1;\n\tget /* c */ g() { return 1; }\n\t@dec /* c */ override /* c */ n() {}\n}`,
		['static', 'async', 'private', 'readonly', 'get', 'override']
	],
	[
		'object accessors',
		`const o = { get /* c */ p() { return 1; }, async /* c */ m() {} };`,
		['get', 'async']
	],
	['else', `if (a) {} /* c */ else /* c */ {}`, ['else']],
	['finally', `try {} finally /* c */ {}`, ['finally']],
	['finally after catch', `try {} catch {} /* c */ finally {}`, ['finally']],
	['do-while', `do {} /* c */ while /* c */ (a);`, ['while']],
	[
		'for await of',
		`async function f() { for /* c */ await /* c */ (const x of /* c */ y) {} }`,
		['async', 'function', 'await', 'of']
	],
	['for in', `for (const k /* c */ in o) {}`, ['in']],
	['import type', `import /* c */ type { T } from 'm';`, ['type']],
	['import type specifier', `import { type /* c */ T, a as /* c */ b } from 'm';`, ['type', 'as']],
	['export type', `type T = 1;\nexport /* c */ type { T };`, ['type']],
	['export star as', `export * as /* c */ ns from 'm';`, ['as']],
	['export specifier as', `const b = 1;\nexport { b as /* c */ c };`, ['as']],
	['enum', `declare /* c */ const /* c */ enum E {}`, ['declare', 'const', 'enum']],
	['namespace', `declare /* c */ namespace N {}`, ['declare', 'namespace']],
	['module', `declare /* c */ module 'm' {}`, ['declare', 'module']],
	[
		'interface',
		`declare /* c */ interface I extends /* c */ J {}`,
		['declare', 'interface', 'extends']
	],
	['type alias', `declare /* c */ type T = string;`, ['declare', 'type']],
	[
		'mapped type',
		`type M = { -readonly /* c */ [K in /* c */ keyof T as /* c */ R<K>]: T[K] };`,
		['readonly', 'in', 'as']
	],
	['as expression', `const v = x /* c */ as /* c */ T;`, ['as']],
	['satisfies expression', `const v = x /* c */ satisfies /* c */ T;`, ['satisfies']],
	[
		'parameter properties',
		`class P { constructor(private /* c */ readonly x: number) {} }`,
		['private', 'readonly']
	],
	['constructor type', `type F = abstract /* c */ new () => object;`, ['abstract', 'new']]
])('tokens map keywords after a node start for %s', (_name, source, words) => {
	expectExactKeywordMappings(source, words);
});

test.each([
	['decorator before export', `@dec export class K {}`],
	['decorator after export', `export @dec class K {}`],
	['decorator before export default', `@dec export default class {}`],
	['decorator after export default', `export default @dec class {}`]
])('`export` of a decorated class maps to its source position: %s', (_name, statement) => {
	// a leading statement keeps the Program's own start mapping off the tested line
	const source = `let a;\n${statement}`;
	const { code, mappings } = mapped(source);
	const segment = mappingAtSubstring(code, 'export', mappings);
	expect(segment.slice(2)).toEqual([1, statement.indexOf('export')]);
	// the printed decorator maps to itself, not to `export`
	expect(sourcePositionsAt(code, '@dec', mappings)).toEqual([[1, statement.indexOf('@dec')]]);
});

test.each([
	['decorator before export', `@dec /* c */ export /* c */ class K {}`, ['class']],
	['decorator after export', `export /* c */ @dec /* c */ class K {}`, ['class']],
	[
		'decorator before export default',
		`@dec export /* c */ default /* c */ class {}`,
		['default', 'class']
	],
	['decorated member', `class K { @dec /* c */ static /* c */ m() {} }`, ['static']]
])('tokens map the keywords of a decorated declaration: %s', (_name, source, words) => {
	expectExactKeywordMappings(source, words);
});
