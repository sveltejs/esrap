// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { PrintOptions } from '../src/types' */
import fs from 'node:fs';
import { expect, test } from 'vitest';
import { walk } from 'zimmerframe';
import { print } from '../src/index.js';
import { acornTs, acornTsx, load } from './common.js';
import tsx from '../src/languages/tsx/index.js';
import { parseSync } from 'oxc-parser';

const compareAcornSnapshots = true;
// `oxc-parser` currently still does not provide `loc` information for comments (https://github.com/oxc-project/oxc/pull/13285),
// so running the // tests for oxc results in about 20 test failures. But this is still helpful to ensure we support
// both environments. Therefore keep the tests, but disable them for now.
const compareOxcSnapshots = false;

/** @param {TSESTree.Node} ast */
function clean(ast) {
	const cleaned = walk(ast, null, {
		_(node, context) {
			// @ts-expect-error
			delete node.loc;
			// @ts-expect-error
			delete node.start;
			// @ts-expect-error
			delete node.end;
			context.next();
		},
		Program(node, context) {
			node.body = node.body.filter((node) => node.type !== 'EmptyStatement');
			context.next();
		},
		BlockStatement(node, context) {
			node.body = node.body.filter((node) => node.type !== 'EmptyStatement');
			context.next();
		},
		Property(node, context) {
			if (node.kind === 'init') {
				if (node.value.type === 'FunctionExpression') {
					node.method = true;
				}

				const value = node.value.type === 'AssignmentPattern' ? node.value.left : node.value;

				if (!node.computed && node.key.type === 'Identifier' && value.type === 'Identifier') {
					node.shorthand = node.key.name === value.name;
				}
			}

			context.next();
		},
		JSXText(node) {
			return {
				...node,
				raw: node.raw.replaceAll('\r', ''),
				value: node.value.replaceAll('\r', '')
			};
		}
	});

	return cleaned;
}

for (const dir of fs.readdirSync(`${__dirname}/samples`)) {
	if (dir[0] === '.') continue;
	const tsMode = dir.startsWith('ts-') || dir.startsWith('tsx-');
	const jsxMode = dir.startsWith('jsx-') || dir.startsWith('tsx-');
	const fileExtension = (tsMode ? 'ts' : 'js') + (jsxMode ? 'x' : '');

	// if (dir.includes('large-file')) continue;

	test(dir, async () => {
		let input_js = '';
		let input_json = '';
		try {
			input_js = fs.readFileSync(`${__dirname}/samples/${dir}/input.${fileExtension}`, 'utf-8');
		} catch (error) {}
		try {
			input_json = fs.readFileSync(`${__dirname}/samples/${dir}/input.json`).toString();
		} catch (error) {}

		/** @type {TSESTree.Program} */
		let acorn_ast;
		/** @type {TSESTree.Program} */
		let oxc_ast;

		/** @type {TSESTree.Comment[]} */
		let acorn_comments;
		/** @type {TSESTree.Comment[]} */
		let oxc_comments;

		/** @type {PrintOptions} */
		let opts;

		if (input_json.length > 0) {
			acorn_ast = JSON.parse(input_json);
			acorn_comments = [];
			oxc_ast = JSON.parse(input_json);
			oxc_comments = [];
			opts = {};
		} else {
			({ ast: acorn_ast, comments: acorn_comments } = load(input_js, { jsx: true }));

			// types are slightly different in oxc-parser, that's why we need the casting here
			({ program: oxc_ast, comments: oxc_comments } =
				/** @type {{ program: TSESTree.Program, comments: TSESTree.Comment[] }} */ (
					/** @type {unknown} */ (parseSync('input.ts', input_js))
				));

			opts = {
				sourceMapSource: 'input.js',
				sourceMapContent: input_js
			};
		}

		const { code: acorn_code, map: acorn_map } = print(
			acorn_ast,
			tsx({ comments: acorn_comments }),
			opts
		);
		const { code: oxc_code } = print(oxc_ast, tsx({ comments: oxc_comments }), opts);

		if (compareAcornSnapshots) {
			fs.writeFileSync(`${__dirname}/samples/${dir}/_actual.${fileExtension}`, acorn_code);
			fs.writeFileSync(
				`${__dirname}/samples/${dir}/_actual.${fileExtension}.map`,
				JSON.stringify(acorn_map, null, '\t')
			);

			const parsed = (jsxMode ? acornTsx : acornTs).parse(acorn_code, {
				ecmaVersion: 'latest',
				sourceType: input_json.length > 0 ? 'script' : 'module',
				locations: true
			});

			fs.writeFileSync(
				`${__dirname}/samples/${dir}/_actual.json`,
				JSON.stringify(
					parsed,
					(key, value) => (typeof value === 'bigint' ? Number(value) : value),
					'\t'
				)
			);

			await expect(
				acorn_code.trim().replace(/^\t+$/gm, '').replaceAll('\r', '')
			).toMatchFileSnapshot(`${__dirname}/samples/${dir}/expected.${fileExtension}`, 'acorn');

			await expect(JSON.stringify(acorn_map, null, '  ').replaceAll('\\r', '')).toMatchFileSnapshot(
				`${__dirname}/samples/${dir}/expected.${fileExtension}.map`
			);

			await expect(clean(/** @type {TSESTree.Node} */ (/** @type {any} */ (parsed)))).toEqual(
				clean(acorn_ast)
			);
		}

		if (compareOxcSnapshots) {
			await expect(oxc_code.trim().replace(/^\t+$/gm, '').replaceAll('\r', '')).toMatchFileSnapshot(
				`${__dirname}/samples/${dir}/expected.${fileExtension}`,
				'oxc'
			);
		}
	});
}
