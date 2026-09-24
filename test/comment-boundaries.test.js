// @ts-check
import { expect, test } from 'vitest';
import { print } from '../src/index.js';
import ts from '../src/languages/ts/index.js';
import { acornParse } from './common.js';

/** @param {string} source */
function reprint(source) {
	const { ast, comments } = acornParse(source, { fileExtension: 'js' });
	return print(ast, ts({ comments })).code;
}

test.each([
	['console.log(1); // eslint-disable-line', 'console.log(1); // eslint-disable-line'],
	['console.log(1); // keep me\n', 'console.log(1); // keep me'],
	['console.log(1); /* keep me */', 'console.log(1); /* keep me */'],
	['/* lead\n */ console.log(1);', '/* lead\n */\nconsole.log(1);'],
	['// alone', '// alone'],
	['// alone\n', '// alone'],
	['/* alone */', '/* alone */'],
	['// first\n// second', '// first\n// second']
])('prints comment boundaries without stray whitespace: %j', (source, expected) => {
	const code = reprint(source);
	expect(code).toBe(expected);
	expect(reprint(code)).toBe(code);
});

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
