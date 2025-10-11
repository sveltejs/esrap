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

/**
 * Convert byte offset to line/column position
 * @param {string} source
 * @param {number} offset
 * @returns {{ line: number, column: number }}
 */
function getPositionFromOffset(source, offset) {
	let line = 1;
	let column = 0;

	for (let i = 0; i < offset && i < source.length; i++) {
		if (source[i] === '\n') {
			line++;
			column = 0;
		} else {
			column++;
		}
	}

	return { line, column };
}

/**
 * Add location information to AST nodes using a more efficient approach
 * @param {any} node
 * @param {string} source
 * @param {Set<any>} visited
 */
function addLocationToNode(node, source, visited = new Set()) {
	if (!node || typeof node !== 'object' || visited.has(node)) {
		return;
	}

	visited.add(node);

	// Add loc to current node if it has start/end
	if (node.start !== undefined && node.end !== undefined) {
		node.loc = {
			start: getPositionFromOffset(source, node.start),
			end: getPositionFromOffset(source, node.end)
		};
	}

	// Process specific known properties to avoid circular references
	const propertiesToProcess = [
		'body',
		'expression',
		'callee',
		'object',
		'property',
		'arguments',
		'params',
		'declarations',
		'id',
		'init',
		'key',
		'value',
		'properties',
		'elements',
		'left',
		'right',
		'test',
		'consequent',
		'alternate',
		'argument',
		'specifiers',
		'local',
		'imported',
		'exported',
		'source',
		'moduleRequest',
		'entries',
		'importName',
		'exportName',
		'returnType',
		'typeParameters',
		'typeAnnotation',
		'decorators',
		'members',
		'elementTypes',
		'types',
		'elementType',
		'rest',
		'computed',
		'optional',
		'shorthand',
		'method',
		'kind',
		'definite',
		'declare',
		'generator',
		'async',
		'directive',
		'block',
		'handler',
		'finalizer',
		'cases',
		'discriminant',
		'guards',
		'statements',
		'declaration',
		'specifier'
	];

	for (const prop of propertiesToProcess) {
		if (node[prop] && typeof node[prop] === 'object') {
			if (Array.isArray(node[prop])) {
				node[prop].forEach((item) => addLocationToNode(item, source, visited));
			} else {
				addLocationToNode(node[prop], source, visited);
			}
		}
	}
}

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

const oxc = true;
const acorn = true;

for (const dir of fs.readdirSync(`${__dirname}/samples`)) {
	// if (dir !== 'comment-inline') continue;
	// if (dir !== 'comment-block') continue;
	// if (dir !== 'jsdoc-indentation') continue;
	// if (dir !== 'import-attributes') continue;
	// if (dir !== 'jsx-basic') continue;
	if (dir[0] === '.') continue;
	const tsMode = dir.startsWith('ts-') || dir.startsWith('tsx-');
	const jsxMode = dir.startsWith('jsx-') || dir.startsWith('tsx-');
	const fileExtension = (tsMode ? 'ts' : 'js') + (jsxMode ? 'x' : '');

	if (dir.includes('large-file')) continue;

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

			({ program: oxc_ast, comments: oxc_comments } = parseSync(
				`input.${fileExtension}`,
				input_js,
				{
					range: true
				}
			));

			// Add location information to AST nodes
			addLocationToNode(oxc_ast, input_js);

			// Convert OXC comment positions to location information and normalize indentation
			oxc_comments = oxc_comments.map((comment) => {
				const startPos = getPositionFromOffset(input_js, comment.start);
				const endPos = getPositionFromOffset(input_js, comment.end);

				let value = comment.value;
				// Normalize indentation for block comments with newlines (same as acorn)
				if (comment.type === 'Block' && /\n/.test(value)) {
					let a = comment.start;
					while (a > 0 && input_js[a - 1] !== '\n') a -= 1;

					let b = a;
					while (/[ \t]/.test(input_js[b])) b += 1;

					const indentation = input_js.slice(a, b);
					value = value.replace(new RegExp(`^${indentation}`, 'gm'), '');
				}

				return {
					type: comment.type,
					value,
					start: comment.start,
					end: comment.end,
					loc: {
						start: startPos,
						end: endPos
					}
				};
			});

			// console.dir({acorn_comments, oxc_comments}, {depth: null})

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
		const { code: oxc_code, map: oxc_map } = print(oxc_ast, tsx({ comments: oxc_comments }), opts);

		if (acorn) {
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

			expect(acorn_code.trim().replace(/^\t+$/gm, '').replaceAll('\r', '')).toMatchFileSnapshot(
				`${__dirname}/samples/${dir}/expected.${fileExtension}`,
				'acorn'
			);

			expect(JSON.stringify(acorn_map, null, '  ').replaceAll('\\r', '')).toMatchFileSnapshot(
				`${__dirname}/samples/${dir}/expected.${fileExtension}.map`
			);

			expect(clean(/** @type {TSESTree.Node} */ (/** @type {any} */ (parsed)))).toEqual(
				clean(acorn_ast)
			);
		}

		if (oxc) {
			fs.writeFileSync(`${__dirname}/samples/${dir}/_actual.oxc.js`, oxc_code);
			// fs.writeFileSync(`${__dirname}/samples/${dir}/_actual.oxc.json`, JSON.stringify(oxc_ast, null, '\t'));
			const acornFile = fs.readFileSync(
				`${__dirname}/samples/${dir}/expected.${fileExtension}`,
				'utf-8'
			);
			const rmvSingleLine = (/** @type {string} */ str) => {
				return str.trim().replace(/^\s*$(?:\r\n?|\n)/gm, '');
			};
			expect(rmvSingleLine(oxc_code)).toMatch(rmvSingleLine(acornFile));
		}
	});
}
