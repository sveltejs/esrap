// @ts-check
import { print } from '../../src/index.js';
import { load } from '../common.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from '../../src/languages/ts.js';

const dir = path.resolve(fileURLToPath(import.meta.url), '..');
const input_js = fs.readFileSync(`${dir}/_input.ts`);
const content = input_js.toString();
const { ast, comments } = load(content);
const { code } = print(ast, ts({ comments }));
fs.writeFileSync(`${dir}/_output.ts`, code);
