/** @import { BaseNode, Command, Visitors, PrintOptions } from './types' */
import { expect, test } from 'vitest';
import oxc from 'oxc-parser';
import * as acorn from 'acorn';
import { tsPlugin } from '@sveltejs/acorn-typescript';
const acornTsx = acorn.Parser.extend(tsPlugin({ jsx: true }));
import { print } from '../src/index.js';
import tsx from '../src/languages/tsx/index.js';

const filename = 'test.ts';

/* const full = `import { signal, effect } from "@maverick-js/signals";
import type { MonacoEditor, createEditor } from "./monacoEditor";

interface Props {
  value?: string;
  className?: string;
}`; */

const justTsInterface = `interface Props {
  value?: string;
  className?: string;
}`;

const input = justTsInterface;

/**
 * @type {BaseNode}
 */
const { program: programOxc } = oxc.parseSync(filename, input, {
	sourceType: 'module',
	lang: 'tsx'
});

/**
 * @type {BaseNode}
 */
const program = acornTsx.parse(input, {
	ecmaVersion: 'latest',
	sourceType: 'module'
});

/* test('OXC vs Acorn AST body', () => {
	expect(programOxc.body[0]).toMatchObject(program.body[0]);
}); */

console.log(programOxc.body, program.body);

test('OXC vs Acorn printed code', () => {
	expect(print(programOxc, tsx()).code).toEqual(print(program, tsx()).code);
});
