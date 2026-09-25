// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

test('comment-only Programs whose location starts at EOF do not grow padding', () => {
	let source = '// alone';
	for (let i = 0; i < 3; i += 1) {
		const { ast, comments } = acornParse(source, { fileExtension: 'js' });
		// typescript-eslint locates an empty Program after its leading comments.
		ast.loc.start = ast.loc.end;
		source = print(ast, ts({ comments })).code;
		expect(source).toBe('// alone');
	}
});
