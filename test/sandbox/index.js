// @ts-check
import { print } from '../../src/index.js';
import { acornParse } from '../common.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '../../src/languages/ts/index.js';

const dir = path.resolve(fileURLToPath(import.meta.url), '..');
const input_js = fs.readFileSync(`${dir}/_input.ts`);
const content = input_js.toString();
const { ast, comments } = acornParse(content);
const { code, map } = print(ast, ts({ comments }), {
	sourceMapSource: '_output.js',
	sourceMapContent: content
});
fs.writeFileSync(`${dir}/_output.js`, code);
fs.writeFileSync(`${dir}/_output.js.map`, map.toString());
