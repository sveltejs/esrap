// @ts-check

import { expect, test } from 'vitest';
import { acornParse } from './common.js';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';

// a long return type must not push `=>` onto its own line (no LineTerminator before `=>`)
test('does not emit a line terminator before `=>` for a long arrow return type', () => {
	const input =
		"const toNode = (kind: string): { kind: 'logical'; value: string } | { kind: 'binary'; value: number } => " +
		"(kind === 'and' ? { kind: 'logical', value: kind } : { kind: 'binary', value: 1 });";

	const { ast } = acornParse(input);
	const { code } = print(ast, ts());

	expect(code).not.toMatch(/[\r\n]\s*=>/);
	expect(() => acornParse(code)).not.toThrow();
});
