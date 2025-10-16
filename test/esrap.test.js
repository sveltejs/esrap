// @ts-check
/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { PrintOptions } from '../src/types' */
import fs from 'node:fs';
import { expect, test } from 'vitest';
import { walk } from 'zimmerframe';
import { print } from '../src/index.js';
import { acornParse, oxcCommentsToEsrapComments, oxcParse } from './common.js';
import tsx from '../src/languages/tsx/index.js';
import { describe } from 'node:test';

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

/**
 * @type {{
 *   [key: string]: {
 *     skip: boolean,
 *     isBaseline: boolean,
 *     parse: (
 *       input: string,
 *       opts: {
 *         sourceType: 'module' | 'script',
 *         jsxMode: boolean,
 *         fileExtension: string
 *       }
 *     ) => {
 *       ast: TSESTree.Program,
 *       comments: TSESTree.Comment[]
 *     },
 *     commentsToEsrapComments?: (input: string, ast: TSESTree.Program, comments: any[]) => {
 *       ast: TSESTree.Program,
 *       comments: TSESTree.Comment[]
 *     },
 *     skipMap: boolean
 *   }
 * }}
 */
const parsers = {
	acorn: {
		skip: false,
		isBaseline: true,
		parse: acornParse,
		skipMap: false
	},
	oxc: {
		skip: false,
		isBaseline: false,
		parse: oxcParse,
		commentsToEsrapComments: oxcCommentsToEsrapComments,
		skipMap: true
	}
};

test('should have 1 baseline', () => {
	let numberOfBaseLine = 0;
	for (const [parserName, { skip, parse, isBaseline, skipMap }] of Object.entries(parsers)) {
		if (isBaseline) numberOfBaseLine++;
	}
	expect(numberOfBaseLine).toBe(1);
});

for (const dir of fs.readdirSync(`${__dirname}/samples`)) {
	// to run only one test, uncomment the following line and comment out the other tests
	// if (dir !== 'comment-inline') continue;
	// if (dir !== 'comment-block') continue;
	// if (dir !== 'jsdoc-indentation') continue;
	// if (dir !== 'import-attributes') continue;
	// if (dir !== 'jsx-basic') continue;
	// if (dir !== 'with') continue;

	if (dir.includes('large-file')) continue;

	if (dir[0] === '.') continue;
	const tsMode = dir.startsWith('ts-') || dir.startsWith('tsx-');
	const jsxMode = dir.startsWith('jsx-') || dir.startsWith('tsx-');
	const fileExtension = (tsMode ? 'ts' : 'js') + (jsxMode ? 'x' : '');

	describe(dir, async () => {
		let input_js = '';
		let input_json = '';
		try {
			input_js = fs.readFileSync(`${__dirname}/samples/${dir}/input.${fileExtension}`, 'utf-8');
		} catch (error) {}
		try {
			input_json = fs.readFileSync(`${__dirname}/samples/${dir}/input.json`).toString();
		} catch (error) {}

		for (const [parserName, { skip, parse, commentsToEsrapComments, isBaseline, skipMap }] of Object.entries(parsers)) {
			test.skipIf(skip)(`test: ${dir}, parser: ${parserName}`, () => {
				/** @type {TSESTree.Program} */
				let ast;

				/** @type {TSESTree.Comment[]} */
				let comments;

				/** @type {PrintOptions} */
				let opts;

				if (input_json.length > 0) {
					ast = JSON.parse(input_json);
					comments = [];
					opts = {};
				} else {
					({ ast, comments } = parse(input_js, { sourceType: 'module', jsxMode, fileExtension }));

					if (commentsToEsrapComments) {
						({ ast, comments }  = commentsToEsrapComments(input_js, ast, comments));
					}

					opts = { sourceMapSource: 'input.js', sourceMapContent: input_js };
				}

				const { code, map } = print(ast, tsx({ comments }), opts);

				const pDir = `${__dirname}/samples/${dir}/${parserName}`;
				if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
				fs.writeFileSync(`${pDir}/_actual.${fileExtension}`, code);
				fs.writeFileSync(`${pDir}/_actual.${fileExtension}.map`, JSON.stringify(map, null, '\t'));

				const { ast: parsedAst } = parse(code, {
					sourceType: input_json.length > 0 ? 'script' : 'module',
					jsxMode,
					fileExtension
				});

				fs.writeFileSync(
					`${pDir}/_actual.json`,
					JSON.stringify(
						parsedAst,
						(key, value) => (typeof value === 'bigint' ? Number(value) : value),
						'\t'
					)
				);

				expect(code.trim().replace(/^\t+$/gm, '').replaceAll('\r', '')).toMatchFileSnapshot(
					`${__dirname}/samples/${dir}/expected.${fileExtension}`
				);

				if (!skipMap) {
					expect(JSON.stringify(map, null, '  ').replaceAll('\\r', '')).toMatchFileSnapshot(
						`${__dirname}/samples/${dir}/expected.${fileExtension}.map`
					);
				}

				if (isBaseline) {
					expect(clean(/** @type {TSESTree.Node} */ (/** @type {any} */ (parsedAst)))).toEqual(
						clean(ast)
					);
				}
			});
		}
	});
}
