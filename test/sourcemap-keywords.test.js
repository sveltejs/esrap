// @ts-check
import { expect, test } from 'vitest';
import ts from '../src/languages/ts/index.js';
import tsx from '../src/languages/tsx/index.js';
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
	const segments = mappingsAtSubstring(code, needle, mappings);
	const segment = segments[0];
	expect(segment).toBeDefined();
	return /** @type {[number, number, number, number]} */ (segment);
}

/**
 * @param {string} code
 * @param {string} needle
 * @param {[number, number, number, number][][]} mappings
 * @returns {[number, number, number, number][]}
 */
function mappingsAtSubstring(code, needle, mappings) {
	const idx = code.indexOf(needle);
	expect(idx >= 0, `needle not in output: ${JSON.stringify(needle)}`).toBe(true);
	return mappingsAtIndex(code, idx, mappings);
}

/**
 * @param {string} code
 * @param {number} index
 * @param {[number, number, number, number][][]} mappings
 * @returns {[number, number, number, number][]}
 */
function mappingsAtIndex(code, index, mappings) {
	const { gen_line, gen_col } = generatedLineColumn(code, index);
	const line = mappings[gen_line];
	expect(line).toBeDefined();
	const line_segments = /** @type {[number, number, number, number][]} */ (line);
	return line_segments.filter((segment) => segment[0] === gen_col);
}

/**
 * @param {string} source
 * @param {{ preserveParens?: boolean, boundaryTokens?: boolean, tokens?: boolean | any[], jsx?: boolean, sourceType?: 'module' | 'script' }} [opts]
 */
function mapped(source, opts = {}) {
	/** @type {any[]} the parser's tokens; passed to the printer when `opts.tokens` is `true` */
	const tokens = [];
	const { ast, comments } = acornParse(source, {
		preserveParens: opts.preserveParens,
		sourceType: opts.sourceType ?? 'module',
		jsxMode: opts.jsx ?? false,
		fileExtension: opts.jsx ? 'tsx' : 'ts',
		tokens
	});
	const language = opts.jsx ? tsx : ts;
	const { code, map } = print(
		ast,
		language({
			comments,
			boundaryTokens: opts.boundaryTokens,
			tokens: opts.tokens === true ? tokens : opts.tokens || undefined
		}),
		{
			sourceMapSource: 'input.ts',
			sourceMapContent: source,
			sourceMapEncodeMappings: false
		}
	);
	expect(map.mappings).toBeTruthy();
	const mappings = /** @type {[number, number, number, number][][]} */ (
		/** @type {unknown} */ (map.mappings)
	);
	return { source, code, mappings, tokens };
}

/**
 * @param {string} source
 * @param {string[]} delimiters
 * @param {{ tokens?: boolean, jsx?: boolean, sourceType?: 'module' | 'script' }} [opts]
 */
function expectExactDelimiterMappings(source, delimiters, opts = {}) {
	const inferred = mapped(source, {
		boundaryTokens: true,
		jsx: opts.jsx,
		sourceType: opts.sourceType
	});
	const { code, mappings, tokens } = mapped(source, {
		boundaryTokens: true,
		tokens: opts.tokens,
		jsx: opts.jsx,
		sourceType: opts.sourceType
	});
	expect(code).toBe(inferred.code);

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
			mappingsAtIndex(code, generated_delimiters[i].index, mappings).map((s) => s.slice(2))
		).toContainEqual([start.line - 1, start.column]);
	}
}

/** @param {string} source */
function expectExactBracketMappings(source) {
	expectExactDelimiterMappings(source, ['[', ']'], { tokens: true });
}

test('source mappings land on keywords (let / function / async / export)', () => {
	{
		const { source, code, mappings } = mapped(`let alpha = 1;`);
		const segment = mappingAtSubstring(code, 'let', mappings);
		expect(segment[2]).toBe(0);
		expect(segment[3]).toBe(source.indexOf('let'));
	}

	{
		const { source, code, mappings } = mapped(`async function bar() {}`);
		const seg_async = mappingAtSubstring(code, 'async', mappings);
		expect(seg_async[2]).toBe(0);
		expect(seg_async[3]).toBe(source.indexOf('async'));

		const seg_fn = mappingAtSubstring(code, 'function', mappings);
		expect(seg_fn[2]).toBe(0);
		expect(seg_fn[3]).toBe(source.indexOf('function'));
	}

	{
		const { source, code, mappings } = mapped(`export default function qux() {}`);
		const seg_export = mappingAtSubstring(code, 'export', mappings);
		expect(seg_export[2]).toBe(0);
		expect(seg_export[3]).toBe(source.indexOf('export'));

		const seg_default = mappingAtSubstring(code, 'default', mappings);
		expect(seg_default[2]).toBe(0);
		expect(seg_default[3]).toBe(source.indexOf('default'));

		const seg_fn = mappingAtSubstring(code, 'function', mappings);
		expect(seg_fn[2]).toBe(0);
		expect(seg_fn[3]).toBe(source.indexOf('function'));
	}
});

test('declare let maps declare and let separately', () => {
	const { source, code, mappings } = mapped(`declare let beta: number;`);

	const seg_declare = mappingAtSubstring(code, 'declare', mappings);
	expect(seg_declare[2]).toBe(0);
	expect(seg_declare[3]).toBe(source.indexOf('declare'));

	const seg_let = mappingAtSubstring(code, 'let', mappings);
	expect(seg_let[2]).toBe(0);
	expect(seg_let[3]).toBe(source.indexOf('let'));
});

test('class static and get map to source keywords', () => {
	{
		const { source, code, mappings } = mapped(`class C { static meth() {} }`);

		const seg_static = mappingAtSubstring(code, 'static', mappings);
		expect(seg_static[3]).toBe(source.indexOf('static'));
	}

	{
		const { source, code, mappings } = mapped(`class D { get x() { return 1; } }`);

		const seg_get = mappingAtSubstring(code, 'get', mappings);
		expect(seg_get[3]).toBe(source.indexOf('get'));
	}
});

test('throw / return / await map to source keywords', () => {
	{
		const { source, code, mappings } = mapped(`function f() { throw new Error('x'); }`);
		const seg = mappingAtSubstring(code, 'throw', mappings);
		expect(seg[3]).toBe(source.indexOf('throw'));
	}

	{
		const { source, code, mappings } = mapped(`function f() { return 42; }`);
		const seg = mappingAtSubstring(code, 'return', mappings);
		expect(seg[3]).toBe(source.indexOf('return'));
	}

	{
		const { source, code, mappings } = mapped(`async function f() { await thing(); }`);
		const seg = mappingAtSubstring(code, 'await', mappings);
		expect(seg[3]).toBe(source.indexOf('await'));
	}
});

test('if / else map to source keywords', () => {
	const { source, code, mappings } = mapped(`if (x) { a(); } else { b(); }`);

	const seg_if = mappingAtSubstring(code, 'if', mappings);
	expect(seg_if[3]).toBe(source.indexOf('if'));

	const seg_else = mappingAtSubstring(code, 'else', mappings);
	expect(seg_else[3]).toBe(source.indexOf('else'));
});

test('try / catch / finally map to source keywords', () => {
	const { source, code, mappings } = mapped(`try { a(); } catch (e) { b(); } finally { c(); }`);

	const seg_try = mappingAtSubstring(code, 'try', mappings);
	expect(seg_try[3]).toBe(source.indexOf('try'));

	const seg_catch = mappingAtSubstring(code, 'catch', mappings);
	expect(seg_catch[3]).toBe(source.indexOf('catch'));

	const seg_finally = mappingAtSubstring(code, 'finally', mappings);
	expect(seg_finally[3]).toBe(source.indexOf('finally'));
});

test('do / while map to source keywords', () => {
	const { source, code, mappings } = mapped(`do { a(); } while (cond);`);

	const seg_do = mappingAtSubstring(code, 'do', mappings);
	expect(seg_do[3]).toBe(source.indexOf('do'));

	const seg_while = mappingAtSubstring(code, 'while', mappings);
	expect(seg_while[3]).toBe(source.indexOf('while'));
});

test('switch / case / default map to source keywords', () => {
	const { source, code, mappings } = mapped(`switch (x) { case 1: a(); break; default: b(); }`);

	const seg_switch = mappingAtSubstring(code, 'switch', mappings);
	expect(seg_switch[3]).toBe(source.indexOf('switch'));

	const seg_case = mappingAtSubstring(code, 'case', mappings);
	expect(seg_case[3]).toBe(source.indexOf('case'));

	const seg_default = mappingAtSubstring(code, 'default', mappings);
	expect(seg_default[3]).toBe(source.indexOf('default'));
});

test('decorator-prefixed class falls back gracefully', () => {
	const source = `@dec\nclass D {}`;
	const { code, mappings } = mapped(source);

	expect(code).toContain('class');
	expect(mappings.length).toBeGreaterThan(0);
});

test('source mappings anchor array and object brackets', () => {
	{
		const { source, code, mappings } = mapped(`const points = [];`, { boundaryTokens: true });

		const seg_open = mappingAtSubstring(code, '[', mappings);
		expect(seg_open[3]).toBe(source.indexOf('['));

		const seg_close = mappingAtSubstring(code, ']', mappings);
		expect(seg_close[3]).toBe(source.indexOf(']'));
	}

	{
		const { source, code, mappings } = mapped(`const box = { a: 1 };`, { boundaryTokens: true });

		const seg_open = mappingAtSubstring(code, '{', mappings);
		expect(seg_open[3]).toBe(source.indexOf('{'));

		const seg_close = mappingAtSubstring(code, '}', mappings);
		expect(seg_close[3]).toBe(source.indexOf('}'));
	}

	{
		// Destructured parameter defaults: the pattern's braces are its span.
		const { source, code, mappings } = mapped(`const use = ({ a = 1 } = {}) => a;`, {
			boundaryTokens: true
		});

		const seg_open = mappingAtSubstring(code, '{', mappings);
		expect(seg_open[3]).toBe(source.indexOf('{'));
	}
});

test('source mappings anchor unary operators', () => {
	const { source, code, mappings } = mapped(`const neg = -value;`, { boundaryTokens: true });

	const seg = mappingAtSubstring(code, '-', mappings);
	expect(seg[3]).toBe(source.indexOf('-'));
});

test('source mappings anchor the closing tokens of calls and computed access', () => {
	{
		const { source, code, mappings } = mapped(`const item = items[index + 1];`, {
			boundaryTokens: true
		});

		const seg_close = mappingAtSubstring(code, ']', mappings);
		expect(seg_close[3]).toBe(source.indexOf(']'));
	}

	{
		const { source, code, mappings } = mapped(`const dir = compute();`, { boundaryTokens: true });

		const seg_close = mappingAtSubstring(code, ')', mappings);
		expect(seg_close[3]).toBe(source.indexOf(')'));
	}
});

test('source mappings anchor preserved parentheses', () => {
	const { source, code, mappings } = mapped(`const x = (a - 1) % b;`, {
		preserveParens: true,
		boundaryTokens: true
	});

	const seg_open = mappingAtSubstring(code, '(', mappings);
	expect(seg_open[3]).toBe(source.indexOf('('));

	const seg_close = mappingAtSubstring(code, ')', mappings);
	expect(seg_close[3]).toBe(source.indexOf(')'));
});

test.each([
	['object property', `const object = { [\nkey\n]: value };`],
	['object method', `const object = { async *[\nmethod\n]() {} };`],
	['object getter', `const object = { get [\nkey\n]() { return 1; } };`],
	['object setter', `const object = { set [\nkey\n](value) {} };`],
	['class method', `class Example { [\nmethod\n]() {} }`],
	['class field', `class Example { [\nfield\n] = 1; }`],
	['type property signature', `type Example = { [\nkey\n]: string }`],
	['type method signature', `type Example = { [\nmethod\n](): void }`]
])('source mappings use supplied computed-key boundary locations for %s', (_name, source) => {
	expectExactBracketMappings(source);
});

test('supplied computed-key locations can span comments and line breaks', () => {
	expectExactBracketMappings(`const object = { [ /* before */\nkey\n/* after */ ]: value };`);
});

test('computed-key brackets are not guessed without tokens', () => {
	// the old inference would anchor `[` to the space before `key`
	const { code, mappings } = mapped(`const object = { [ key ]: value };`, { boundaryTokens: true });
	expect(mappingsAtSubstring(code, '[', mappings)).toEqual([]);
});

test('tokens without locations leave mappings unchanged', () => {
	const source = `const object = { [key]: fn(value) };`;
	const { mappings, tokens } = mapped(source, { boundaryTokens: true });
	const bare = tokens.map(({ type, value }) => ({ type, value }));
	expect(mapped(source, { boundaryTokens: true, tokens: bare }).mappings).toEqual(mappings);
	expect(mapped(source, { boundaryTokens: true, tokens: [] }).mappings).toEqual(mappings);
});

test('tokens out of source order still locate delimiters', () => {
	// acorn-typescript backtracks and re-emits tokens, so its stream is not monotone
	const source = `const object = { [ key ]: fn( value ) };`;
	const { mappings, tokens } = mapped(source, { boundaryTokens: true, tokens: true });
	const reversed = [...tokens].reverse();
	expect(mapped(source, { boundaryTokens: true, tokens: reversed }).mappings).toEqual(mappings);
});

test('ESLint-style punctuator tokens locate delimiters', () => {
	const source = `const object = { [ key ]: fn( value ) };`;
	const { mappings, tokens } = mapped(source, { boundaryTokens: true, tokens: true });
	const punctuators = tokens.map((token) => ({
		type: 'Punctuator',
		value: token.type.label,
		loc: token.loc
	}));
	expect(mapped(source, { boundaryTokens: true, tokens: punctuators }).mappings).toEqual(mappings);
});

test.each([
	['array expression', `const values = [ /* before */\nvalue\n/* after */ ];`],
	['array pattern', `const [ /* before */\nvalue\n/* after */ ] = values;`],
	['computed member access', `const value = object[ /* before */\nkey\n/* after */ ];`],
	['array type', `type Values = Item /* before */ [ /* after */ ];`],
	['index signature', `type Dictionary = { [ /* before */ key: string /* after */ ]: number };`],
	[
		'mapped type',
		`type Selected = { [ /* before */ K in Keys as Rename<K> /* after */ ]: string };`
	],
	['tuple type', `type Pair = [ /* before */ First, Second /* after */ ];`],
	['indexed access type', `type Value = Object[ /* before */ Key /* after */ ];`]
])('source mappings use supplied square-bracket locations for %s', (_name, source) => {
	expectExactBracketMappings(source);
});

test.each([
	['block', `function example() { return; }`, ['{', '}'], {}],
	['type literal', `type Example = { value: string };`, ['{', '}'], {}],
	['mapped type', `type Example = { [K in Keys]: string };`, ['{', '}'], {}],
	['module block', `namespace Example { export const value = 1; }`, ['{', '}'], {}],
	['interface body', `interface Example { value: string }`, ['{', '}'], {}],
	['parenthesized type', `type Example = (First | Second);`, ['(', ')'], {}],
	['JSX expression container', `const element = <div>{value}</div>;`, ['{', '}'], { jsx: true }],
	['JSX spread attribute', `const element = <div {...props} />;`, ['{', '}'], { jsx: true }]
])('boundaryTokens maps outer delimiters for %s', (_name, source, delimiters, opts) => {
	expectExactDelimiterMappings(source, delimiters, opts);
});

test.each([
	['call expression', `const result = fn /* before */ ( /* inside */ value /* after */ );`, {}],
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
	['class method', `class Example { method /* before */ ( value /* after */ ) {} }`, {}],
	['object method', `const object = { method /* before */ ( value /* after */ ) {} };`, {}],
	['arrow function', `const callback = ( /* before */ value /* after */ ) => value;`, {}],
	['empty arrow function', `const callback = /* before */ () => value;`, {}],
	['nested method delimiters', `class Example { [getKey()] /* before */ (value = make()) {} }`, {}],
	['nested parameter delimiters', `function example(value = make(1)) {}`, {}],
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
])('supplied tokens map internal parentheses for %s', (_name, source, opts) => {
	expectExactDelimiterMappings(source, ['(', ')'], {
		tokens: true,
		sourceType: 'sourceType' in opts && opts.sourceType === 'script' ? 'script' : undefined
	});
});

test.each([
	['named import', `import { /* before */ value /* after */ } from 'module';`],
	['empty named export', `export { /* inside */ };`],
	['import attributes', `import value from 'module' with { type: 'json' };`],
	['static block', `class Example { static /* before */ { value; } }`],
	['switch body', `switch (value) /* before */ { default: break; }`],
	['enum body', `enum Example /* before */ { Value }`],
	['template interpolation', 'const result = `before ${ /* before */ value /* after */ } after`;'],
	['template-literal type interpolation', 'type Result = `before ${Value} after`;']
])('supplied tokens map internal curly braces for %s', (_name, source) => {
	expectExactDelimiterMappings(source, ['{', '}'], { tokens: true });
});

test('control-flow mappings select the outer authored parentheses', () => {
	const source = `if /* before */ ((condition)) {}`;
	const { code, mappings, tokens } = mapped(source, { boundaryTokens: true, tokens: true });
	const opens = tokens.filter((token) => token.type.label === '(');
	const closes = tokens.filter((token) => token.type.label === ')');

	expect(
		mappingsAtSubstring(code, '(', mappings).map((segment) => segment.slice(2))
	).toContainEqual([opens[0].loc.start.line - 1, opens[0].loc.start.column]);
	expect(
		mappingsAtSubstring(code, ')', mappings).map((segment) => segment.slice(2))
	).toContainEqual([
		closes[closes.length - 1].loc.start.line - 1,
		closes[closes.length - 1].loc.start.column
	]);
});
