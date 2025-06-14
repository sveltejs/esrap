/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Visitors, NodeWithComments, Context } from '../types.js' */
import { EXPRESSIONS_PRECEDENCE } from './utils/precedence.js';

const OPERATOR_PRECEDENCE = {
	'||': 2,
	'&&': 3,
	'??': 4,
	'|': 5,
	'^': 6,
	'&': 7,
	'==': 8,
	'!=': 8,
	'===': 8,
	'!==': 8,
	'<': 9,
	'>': 9,
	'<=': 9,
	'>=': 9,
	in: 9,
	instanceof: 9,
	'<<': 10,
	'>>': 10,
	'>>>': 10,
	'+': 11,
	'-': 11,
	'*': 12,
	'%': 12,
	'/': 12,
	'**': 13
};

// TODO this should not be exported, it is JS/TS specific
/**
 * @param {TSESTree.Comment} comment
 * @param {Context} context
 */
export function push_comment(comment, context) {
	// console.trace();

	if (comment.type === 'Line') {
		context.write(`//${comment.value}`);
		context.newline();
	} else {
		context.write('/*');
		const lines = comment.value.split('\n');

		for (let i = 0; i < lines.length; i += 1) {
			if (i > 0) context.newline();
			context.write(lines[i]);
		}

		context.write('*/');
	}
}

// TODO this should not be exported, it is JS/TS specific
/** @type {TSESTree.Comment[]} */
export let comments = [];

export const shared = {
	/**
	 * @param {TSESTree.ArrayExpression | TSESTree.ArrayPattern} node
	 * @param {Context} context
	 */
	'ArrayExpression|ArrayPattern': (node, context) => {
		context.write('[');
		context.inline(/** @type {TSESTree.Node[]} */ (node.elements), false);
		context.write(']');
	},

	/**
	 * @param {TSESTree.BinaryExpression | TSESTree.LogicalExpression} node
	 * @param {Context} context
	 */
	'BinaryExpression|LogicalExpression': (node, context) => {
		// TODO
		// const is_in = node.operator === 'in';
		// if (is_in) {
		// 	// Avoids confusion in `for` loops initializers
		// 	chunks.write('(');
		// }
		if (needs_parens(node.left, node, false)) {
			context.write('(');
			context.visit(node.left);
			context.write(')');
		} else {
			context.visit(node.left);
		}

		context.write(` ${node.operator} `);

		if (needs_parens(node.right, node, true)) {
			context.write('(');
			context.visit(node.right);
			context.write(')');
		} else {
			context.visit(node.right);
		}
	},

	/**
	 * @param {TSESTree.BlockStatement | TSESTree.ClassBody} node
	 * @param {Context} context
	 */
	'BlockStatement|ClassBody': (node, context) => {
		if (node.loc) {
			const { line, column } = node.loc.start;
			context.location(line, column);
			context.write('{');
			context.location(line, column + 1);
		} else {
			context.write('{');
		}

		if (node.body.length > 0) {
			context.indent();
			context.newline();
			context.block(node.body);
			context.dedent();
			context.newline();
		}

		if (node.loc) {
			const { line, column } = node.loc.end;

			context.location(line, column - 1);
			context.write('}');
			context.location(line, column);
		} else {
			context.write('}');
		}
	},

	/**
	 * @param {TSESTree.CallExpression | TSESTree.NewExpression} node
	 * @param {Context} context
	 */
	'CallExpression|NewExpression': (node, context) => {
		if (node.type === 'NewExpression') {
			context.write('new ');
		}

		const needs_parens =
			EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression ||
			(node.type === 'NewExpression' && has_call_expression(node.callee));

		if (needs_parens) {
			context.write('(');
			context.visit(node.callee);
			context.write(')');
		} else {
			context.visit(node.callee);
		}

		if (/** @type {TSESTree.CallExpression} */ (node).optional) {
			context.write('?.');
		}

		if (node.typeArguments) context.visit(node.typeArguments);

		const open = context.new();
		const join = context.new();

		context.write('(');
		context.append(open);

		// if the final argument is multiline, it doesn't need to force all the
		// other arguments to also be multiline
		const child_context = context.new();
		const final_context = context.new();

		context.append(child_context);
		context.append(final_context);

		for (let i = 0; i < node.arguments.length; i += 1) {
			const context = i === node.arguments.length - 1 ? final_context : child_context;

			const p = node.arguments[i];

			if (i > 0) context.write(',');

			if (_comments.length > 0) {
				context.write(' ');
				push_comment(_comments[0], context);
				if (_comments[0].type === 'Line') {
					child_context.multiline = true;
				}
				_comments.length = 0;
			}

			if (i > 0) context.append(join);

			context.visit(p);
		}

		context.multiline ||= child_context.multiline || final_context.multiline;

		if (child_context.multiline) {
			open.indent();
			open.newline();
			join.newline();
			context.dedent();
			context.newline();
		} else {
			join.write(' ');
		}

		context.write(')');
	},

	/**
	 * @param {TSESTree.ClassDeclaration | TSESTree.ClassExpression} node
	 * @param {Context} context
	 */
	'ClassDeclaration|ClassExpression': (node, context) => {
		context.write('class ');

		if (node.id) {
			context.visit(node.id);
			context.write(' ');
		}

		if (node.superClass) {
			context.write('extends ');
			context.visit(node.superClass);
			context.write(' ');
		}

		if (node.implements) {
			context.write('implements ');
			context.inline(node.implements, false);
		}

		context.visit(node.body);
	},

	/**
	 * @param {TSESTree.ForInStatement | TSESTree.ForOfStatement} node
	 * @param {Context} context
	 */
	'ForInStatement|ForOfStatement': (node, context) => {
		context.write('for ');
		if (node.type === 'ForOfStatement' && node.await) context.write('await ');
		context.write('(');

		if (node.left.type === 'VariableDeclaration') {
			handle_var_declaration(node.left, context);
		} else {
			context.visit(node.left);
		}

		context.write(node.type === 'ForInStatement' ? ' in ' : ' of ');
		context.visit(node.right);
		context.write(') ');
		context.visit(node.body);
	},

	/**
	 * @param {TSESTree.FunctionDeclaration | TSESTree.FunctionExpression} node
	 * @param {Context} context
	 */
	'FunctionDeclaration|FunctionExpression': (node, context) => {
		if (node.async) context.write('async ');
		context.write(node.generator ? 'function* ' : 'function ');
		if (node.id) context.visit(node.id);

		if (node.typeParameters) {
			context.visit(node.typeParameters);
		}

		context.write('(');
		context.inline(node.params, false);
		context.write(')');

		if (node.returnType) context.visit(node.returnType);

		context.write(' ');

		context.visit(node.body);
	},

	/**
	 * @param {TSESTree.RestElement | TSESTree.SpreadElement} node
	 * @param {Context} context
	 */
	'RestElement|SpreadElement': (node, context) => {
		context.write('...');
		context.visit(node.argument);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		if (node.typeAnnotation) context.visit(node.typeAnnotation);
	}
};

/** @type {TSESTree.Comment[]} */
export let _comments = [];

/** @type {Visitors<TSESTree.Node>} */
export default {
	_(node, context, visit) {
		const leading_comments = /** @type {TSESTree.Comment[]} */ (
			/** @type {any} */ (node).leadingComments
		);

		const trailing_comments = /** @type {TSESTree.Comment[]} */ (
			/** @type {any} */ (node).trailingComments
		);

		const comments = [..._comments, ...(leading_comments || [])];

		// if (leading_comments) {
		for (const comment of comments) {
			push_comment(comment, context);

			if (comment.type === 'Block') {
				if (comment.value.includes('\n')) {
					context.newline();
				} else {
					context.write(' ');
				}
			}

			// if (comment.type === 'Line' || comment.value.includes('\n')) {
			// 	context.newline();
			// } else {
			// 	context.write(' ');
			// }
		}
		// }

		_comments.length = 0;

		visit(node);

		if (trailing_comments) {
			// console.log(node.start, node.type, trailing_comments);
			if (/(Statement|Declaration)$/.test(node.type)) {
				for (const comment of trailing_comments) {
					context.write(' ');
					push_comment(comment, context);

					if (comment.type === 'Line' || comment.value.includes('\n')) {
						// context.newline();
					} else {
						// context.write(' ');
					}
				}
			} else {
				_comments.push(...trailing_comments);
			}

			// context.write(' ');
			// // push_comment(trailing_comments[0], context);

			// for (const comment of trailing_comments) {
			// 	push_comment(comment, context);

			// 	if (comment.type === 'Line' || comment.value.includes('\n')) {
			// 		context.newline();
			// 	} else {
			// 		// context.write(' ');
			// 	}
			// }

			// // comments.push(trailing_comments[0]); // there is only ever one
		}
	},

	ArrayExpression: shared['ArrayExpression|ArrayPattern'],

	ArrayPattern: shared['ArrayExpression|ArrayPattern'],

	ArrowFunctionExpression: (node, context) => {
		if (node.async) context.write('async ');

		context.write('(');
		context.inline(node.params, false);
		context.write(') => ');

		if (
			node.body.type === 'ObjectExpression' ||
			(node.body.type === 'AssignmentExpression' && node.body.left.type === 'ObjectPattern') ||
			(node.body.type === 'LogicalExpression' && node.body.left.type === 'ObjectExpression') ||
			(node.body.type === 'ConditionalExpression' && node.body.test.type === 'ObjectExpression')
		) {
			context.write('(');
			context.visit(node.body);
			context.write(')');
		} else {
			context.visit(node.body);
		}
	},

	AssignmentExpression(node, context) {
		context.visit(node.left);
		context.write(` ${node.operator} `);
		context.visit(node.right);
	},

	AssignmentPattern(node, context) {
		context.visit(node.left);
		context.write(' = ');
		context.visit(node.right);
	},

	AwaitExpression(node, context) {
		if (node.argument) {
			const precedence = EXPRESSIONS_PRECEDENCE[node.argument.type];

			if (precedence && precedence < EXPRESSIONS_PRECEDENCE.AwaitExpression) {
				context.write('await (');
				context.visit(node.argument);
				context.write(')');
			} else {
				context.write('await ');
				context.visit(node.argument);
			}
		} else {
			context.write('await');
		}
	},

	BinaryExpression: shared['BinaryExpression|LogicalExpression'],

	BlockStatement: shared['BlockStatement|ClassBody'],

	BreakStatement(node, context) {
		if (node.label) {
			context.write('break ');
			context.visit(node.label);
			context.write(';');
		} else {
			context.write('break;');
		}
	},

	CallExpression: shared['CallExpression|NewExpression'],

	ChainExpression(node, context) {
		context.visit(node.expression);
	},

	ClassBody: shared['BlockStatement|ClassBody'],

	ClassDeclaration: shared['ClassDeclaration|ClassExpression'],

	ClassExpression: shared['ClassDeclaration|ClassExpression'],

	ConditionalExpression(node, context) {
		if (EXPRESSIONS_PRECEDENCE[node.test.type] > EXPRESSIONS_PRECEDENCE.ConditionalExpression) {
			context.visit(node.test);
		} else {
			context.write('(');
			context.visit(node.test);
			context.write(')');
		}

		const consequent = context.new();
		const alternate = context.new();

		// TODO flush comments here, rather than in visitors

		consequent.visit(node.consequent);
		alternate.visit(node.alternate);

		if (
			consequent.multiline ||
			alternate.multiline ||
			consequent.measure() + alternate.measure() > 50
		) {
			context.indent();
			context.newline();
			context.write('? ');
			context.append(consequent);
			context.newline();
			context.write(': ');
			context.append(alternate);
			context.dedent();
		} else {
			context.write(' ? ');
			context.append(consequent);
			context.write(' : ');
			context.append(alternate);
		}
	},

	ContinueStatement(node, context) {
		if (node.label) {
			context.write('continue ');
			context.visit(node.label);
			context.write(';');
		} else {
			context.write('continue;');
		}
	},

	DebuggerStatement(node, context) {
		context.write('debugger', node);
		context.write(';');
	},

	Decorator(node, context) {
		context.write('@');
		context.visit(node.expression);
		context.newline();
	},

	DoWhileStatement(node, context) {
		context.write('do ');
		context.visit(node.body);
		context.write(' while (');
		context.visit(node.test);
		context.write(');');
	},

	EmptyStatement(node, context) {
		context.write(';');
	},

	ExportAllDeclaration(node, context) {
		context.write('export * ');
		if (node.exported) {
			context.write('as ');
			context.visit(node.exported);
		}
		context.write(' from ');
		context.visit(node.source);
		context.write(';');
	},

	ExportDefaultDeclaration(node, context) {
		context.write('export default ');

		context.visit(node.declaration);

		if (node.declaration.type !== 'FunctionDeclaration') {
			context.write(';');
		}
	},

	ExportNamedDeclaration(node, context) {
		context.write('export ');

		if (node.declaration) {
			context.visit(node.declaration);
			return;
		}

		context.write('{');
		context.inline(node.specifiers, true);
		context.write('}');

		if (node.source) {
			context.write(' from ');
			context.visit(node.source);
		}

		context.write(';');
	},

	ExportSpecifier(node, context) {
		context.visit(node.local);

		if (node.local.name !== node.exported.name) {
			context.write(' as ');
			context.visit(node.exported);
		}
	},

	ExpressionStatement(node, context) {
		if (
			node.expression.type === 'ObjectExpression' ||
			(node.expression.type === 'AssignmentExpression' &&
				node.expression.left.type === 'ObjectPattern') ||
			node.expression.type === 'FunctionExpression'
		) {
			// is an AssignmentExpression to an ObjectPattern
			context.write('(');
			context.visit(node.expression);
			context.write(');');
			return;
		}

		context.visit(node.expression);
		context.write(';');
	},

	ForStatement: (node, context) => {
		context.write('for (');

		if (node.init) {
			if (node.init.type === 'VariableDeclaration') {
				handle_var_declaration(node.init, context);
			} else {
				context.visit(node.init);
			}
		}

		context.write('; ');
		if (node.test) context.visit(node.test);
		context.write('; ');
		if (node.update) context.visit(node.update);

		context.write(') ');
		context.visit(node.body);
	},

	ForInStatement: shared['ForInStatement|ForOfStatement'],

	ForOfStatement: shared['ForInStatement|ForOfStatement'],

	FunctionDeclaration: shared['FunctionDeclaration|FunctionExpression'],

	FunctionExpression: shared['FunctionDeclaration|FunctionExpression'],

	Identifier(node, context) {
		let name = node.name;
		context.write(name, node);

		if (node.typeAnnotation) context.visit(node.typeAnnotation);
	},

	IfStatement(node, context) {
		context.write('if (');
		context.visit(node.test);
		context.write(') ');
		context.visit(node.consequent);

		if (node.alternate) {
			context.write(' else ');
			context.visit(node.alternate);
		}
	},

	ImportDeclaration(node, context) {
		if (node.specifiers.length === 0) {
			context.write('import ');
			context.visit(node.source);
			context.write(';');
			return;
		}

		/** @type {TSESTree.ImportNamespaceSpecifier | null} */
		let namespace_specifier = null;

		/** @type {TSESTree.ImportDefaultSpecifier | null} */
		let default_specifier = null;

		/** @type {TSESTree.ImportSpecifier[]} */
		const named_specifiers = [];

		for (const s of node.specifiers) {
			if (s.type === 'ImportNamespaceSpecifier') {
				namespace_specifier = s;
			} else if (s.type === 'ImportDefaultSpecifier') {
				default_specifier = s;
			} else {
				named_specifiers.push(s);
			}
		}

		context.write('import ');
		if (node.importKind == 'type') context.write('type ');

		if (default_specifier) {
			context.write(default_specifier.local.name, default_specifier);
			if (namespace_specifier || named_specifiers.length > 0) context.write(', ');
		}

		if (namespace_specifier) {
			context.write('* as ' + namespace_specifier.local.name, namespace_specifier);
		}

		if (named_specifiers.length > 0) {
			context.write('{');
			context.inline(named_specifiers, true);
			context.write('}');
		}

		context.write(' from ');
		context.visit(node.source);
		if (node.attributes && node.attributes.length > 0) {
			context.write(' with { ');
			for (let index = 0; index < node.attributes.length; index++) {
				const { key, value } = node.attributes[index];
				context.visit(key);
				context.write(': ');
				context.visit(value);
				if (index + 1 !== node.attributes.length) {
					context.write(', ');
				}
			}
			context.write(' }');
		}
		context.write(';');
	},

	ImportExpression(node, context) {
		context.write('import(');
		context.visit(node.source);
		//@ts-expect-error for some reason the types haven't been updated
		if (node.arguments) {
			//@ts-expect-error
			for (let index = 0; index < node.arguments.length; index++) {
				context.write(', ');
				//@ts-expect-error
				context.visit(node.arguments[index]);
			}
		}
		context.write(')');
	},

	ImportSpecifier(node, context) {
		if (node.local.name !== node.imported.name) {
			context.visit(node.imported);
			context.write(' as ');
		}

		if (node.importKind == 'type') context.write('type ');
		context.visit(node.local);
	},

	LabeledStatement(node, context) {
		context.visit(node.label);
		context.write(': ');
		context.visit(node.body);
	},

	Literal(node, context) {
		// TODO do we need to handle weird unicode characters somehow?
		// str.replace(/\\u(\d{4})/g, (m, n) => String.fromCharCode(+n))
		const value =
			node.raw || (typeof node.value === 'string' ? context.quote(node.value) : String(node.value));

		context.write(value, node);
	},

	LogicalExpression: shared['BinaryExpression|LogicalExpression'],

	MemberExpression(node, context) {
		if (EXPRESSIONS_PRECEDENCE[node.object.type] < EXPRESSIONS_PRECEDENCE.MemberExpression) {
			context.write('(');
			context.visit(node.object);
			context.write(')');
		} else {
			context.visit(node.object);
		}

		if (node.computed) {
			if (node.optional) {
				context.write('?.');
			}
			context.write('[');
			context.visit(node.property);
			context.write(']');
		} else {
			context.write(node.optional ? '?.' : '.');
			context.visit(node.property);
		}
	},

	MetaProperty(node, context) {
		context.visit(node.meta);
		context.write('.');
		context.visit(node.property);
	},

	MethodDefinition(node, context) {
		if (node.decorators) {
			for (const decorator of node.decorators) {
				context.visit(decorator);
			}
		}

		if (node.static) {
			context.write('static ');
		}

		if (node.kind === 'get' || node.kind === 'set') {
			// Getter or setter
			context.write(node.kind + ' ');
		}

		if (node.value.async) {
			context.write('async ');
		}

		if (node.value.generator) {
			context.write('*');
		}

		if (node.computed) context.write('[');
		context.visit(node.key);
		if (node.computed) context.write(']');

		context.write('(');
		context.inline(node.value.params, false);
		context.write(')');

		if (node.value.returnType) context.visit(node.value.returnType);

		context.write(' ');

		if (node.value.body) context.visit(node.value.body);
	},

	NewExpression: shared['CallExpression|NewExpression'],

	ObjectExpression(node, context) {
		context.write('{');
		context.inline(node.properties, true);
		context.write('}');
	},

	ObjectPattern(node, context) {
		context.write('{');
		context.inline(node.properties, true);
		context.write('}');

		if (node.typeAnnotation) context.visit(node.typeAnnotation);
	},

	// @ts-expect-error this isn't a real node type, but Acorn produces it
	ParenthesizedExpression(node, context) {
		return context.visit(node.expression);
	},

	PrivateIdentifier(node, context) {
		context.write('#');
		context.write(node.name, node);
	},

	Program(node, context) {
		comments.length = 0;
		context.block(node.body);
	},

	Property(node, context) {
		const value = node.value.type === 'AssignmentPattern' ? node.value.left : node.value;

		const shorthand =
			!node.computed &&
			node.kind === 'init' &&
			node.key.type === 'Identifier' &&
			value.type === 'Identifier' &&
			node.key.name === value.name;

		if (shorthand) {
			context.visit(node.value);
			return;
		}

		// shorthand methods
		if (node.value.type === 'FunctionExpression') {
			if (node.kind !== 'init') context.write(node.kind + ' ');
			if (node.value.async) context.write('async ');
			if (node.value.generator) context.write('*');
			if (node.computed) context.write('[');
			context.visit(node.key);
			if (node.computed) context.write(']');
			context.write('(');
			context.inline(node.value.params, false);
			context.write(')');

			if (node.value.returnType) context.visit(node.value.returnType);

			context.write(' ');
			context.visit(node.value.body);
		} else {
			if (node.computed) context.write('[');
			if (node.kind === 'get' || node.kind === 'set') context.write(node.kind + ' ');
			context.visit(node.key);
			context.write(node.computed ? ']: ' : ': ');
			context.visit(node.value);
		}
	},

	PropertyDefinition(node, context) {
		if (node.decorators) {
			for (const decorator of node.decorators) {
				context.visit(decorator);
			}
		}

		if (node.accessibility) {
			context.write(node.accessibility + ' ');
		}

		if (node.static) {
			context.write('static ');
		}

		if (node.computed) {
			context.write('[');
			context.visit(node.key);
			context.write(']');
		} else {
			context.visit(node.key);
		}

		if (node.typeAnnotation) {
			context.write(': ');
			context.visit(node.typeAnnotation.typeAnnotation);
		}

		if (node.value) {
			context.write(' = ');
			context.visit(node.value);
		}

		context.write(';');
	},

	RestElement: shared['RestElement|SpreadElement'],

	ReturnStatement(node, context) {
		if (node.argument) {
			const argumentWithComment = /** @type {NodeWithComments} */ (node.argument);
			const contains_comment =
				argumentWithComment.leadingComments &&
				argumentWithComment.leadingComments.some((comment) => comment.type === 'Line');

			context.write(contains_comment ? 'return (' : 'return ');
			context.visit(node.argument);
			context.write(contains_comment ? ');' : ';');
		} else {
			context.write('return;');
		}
	},

	SequenceExpression(node, context) {
		context.write('(');
		context.inline(node.expressions, false);
		context.write(')');
	},

	SpreadElement: shared['RestElement|SpreadElement'],

	StaticBlock(node, context) {
		context.write('static {');
		context.indent();
		context.newline();

		context.block(node.body);

		context.dedent();
		context.newline();
		context.write('}');
	},

	Super(node, context) {
		context.write('super', node);
	},

	SwitchStatement(node, context) {
		context.write('switch (');
		context.visit(node.discriminant);
		context.write(') {');
		context.indent();

		let first = true;

		for (const block of node.cases) {
			if (!first) {
				context.margin();
			}

			first = false;

			if (block.test) {
				context.newline();
				context.write('case ');
				context.visit(block.test);
				context.write(':');
			} else {
				context.newline();
				context.write('default:');
			}

			context.indent();

			for (const statement of block.consequent) {
				context.newline();
				context.visit(statement);
			}

			context.dedent();
		}

		context.dedent();
		context.newline();
		context.write('}');
	},

	TaggedTemplateExpression(node, context) {
		context.visit(node.tag);
		context.visit(node.quasi);
	},

	TemplateLiteral(node, context) {
		context.write('`');

		const { quasis, expressions } = node;

		for (let i = 0; i < expressions.length; i++) {
			const raw = quasis[i].value.raw;

			context.write(raw + '${');
			context.visit(expressions[i]);
			context.write('}');

			if (/\n/.test(raw)) context.multiline = true;
		}

		const raw = quasis[quasis.length - 1].value.raw;

		context.write(raw + '`');
		if (/\n/.test(raw)) context.multiline = true;
	},

	ThisExpression(node, context) {
		context.write('this', node);
	},

	ThrowStatement(node, context) {
		context.write('throw ');
		if (node.argument) context.visit(node.argument);
		context.write(';');
	},

	TryStatement(node, context) {
		context.write('try ');
		context.visit(node.block);

		if (node.handler) {
			if (node.handler.param) {
				context.write(' catch(');
				context.visit(node.handler.param);
				context.write(') ');
			} else {
				context.write(' catch ');
			}

			context.visit(node.handler.body);
		}

		if (node.finalizer) {
			context.write(' finally ');
			context.visit(node.finalizer);
		}
	},

	UnaryExpression(node, context) {
		context.write(node.operator);

		if (node.operator.length > 1) {
			context.write(' ');
		}

		if (EXPRESSIONS_PRECEDENCE[node.argument.type] < EXPRESSIONS_PRECEDENCE.UnaryExpression) {
			context.write('(');
			context.visit(node.argument);
			context.write(')');
		} else {
			context.visit(node.argument);
		}
	},

	UpdateExpression(node, context) {
		if (node.prefix) {
			context.write(node.operator);
			context.visit(node.argument);
		} else {
			context.visit(node.argument);
			context.write(node.operator);
		}
	},

	VariableDeclaration(node, context) {
		handle_var_declaration(node, context);
		context.write(';');
	},

	VariableDeclarator(node, context) {
		context.visit(node.id);

		if (node.init) {
			context.write(' = ');
			context.visit(node.init);
		}
	},

	WhileStatement(node, context) {
		context.write('while (');
		context.visit(node.test);
		context.write(') ');
		context.visit(node.body);
	},

	WithStatement(node, context) {
		context.write('with (');
		context.visit(node.object);
		context.write(') ');
		context.visit(node.body);
	},

	YieldExpression(node, context) {
		if (node.argument) {
			context.write(node.delegate ? `yield* ` : `yield `);
			context.visit(node.argument);
		} else {
			context.write(node.delegate ? `yield*` : `yield`);
		}
	}
};

/** @satisfies {Visitors} */

/**
 *
 * @param {TSESTree.Expression | TSESTree.PrivateIdentifier} node
 * @param {TSESTree.BinaryExpression | TSESTree.LogicalExpression} parent
 * @param {boolean} is_right
 * @returns
 */
function needs_parens(node, parent, is_right) {
	if (node.type === 'PrivateIdentifier') return false;

	// special case where logical expressions and coalesce expressions cannot be mixed,
	// either of them need to be wrapped with parentheses
	if (
		node.type === 'LogicalExpression' &&
		parent.type === 'LogicalExpression' &&
		((parent.operator === '??' && node.operator !== '??') ||
			(parent.operator !== '??' && node.operator === '??'))
	) {
		return true;
	}

	const precedence = EXPRESSIONS_PRECEDENCE[node.type];
	const parent_precedence = EXPRESSIONS_PRECEDENCE[parent.type];

	if (precedence !== parent_precedence) {
		// Different node types
		return (
			(!is_right && precedence === 15 && parent_precedence === 14 && parent.operator === '**') ||
			precedence < parent_precedence
		);
	}

	if (precedence !== 13 && precedence !== 14) {
		// Not a `LogicalExpression` or `BinaryExpression`
		return false;
	}

	if (
		/** @type {TSESTree.BinaryExpression} */ (node).operator === '**' &&
		parent.operator === '**'
	) {
		// Exponentiation operator has right-to-left associativity
		return !is_right;
	}

	if (is_right) {
		// Parenthesis are used if both operators have the same precedence
		return (
			OPERATOR_PRECEDENCE[/** @type {TSESTree.BinaryExpression} */ (node).operator] <=
			OPERATOR_PRECEDENCE[parent.operator]
		);
	}

	return (
		OPERATOR_PRECEDENCE[/** @type {TSESTree.BinaryExpression} */ (node).operator] <
		OPERATOR_PRECEDENCE[parent.operator]
	);
}

/** @param {TSESTree.Node} node */
function has_call_expression(node) {
	while (node) {
		if (node.type === 'CallExpression') {
			return true;
		} else if (node.type === 'MemberExpression') {
			node = node.object;
		} else {
			return false;
		}
	}
}

/**
 * @param {TSESTree.VariableDeclaration} node
 * @param {Context} context
 */
function handle_var_declaration(node, context) {
	const open = context.new();
	const join = context.new();
	const child_context = context.new();

	context.append(child_context);

	child_context.write(`${node.kind} `);
	child_context.append(open);

	let first = true;

	for (const d of node.declarations) {
		if (!first) child_context.append(join);
		first = false;

		child_context.visit(d);
	}

	const length = child_context.measure() + 2 * (node.declarations.length - 1);

	const multiline = child_context.multiline || (node.declarations.length > 1 && length > 50);

	if (multiline) {
		context.multiline = true;

		if (node.declarations.length > 1) open.indent();
		join.write(',');
		join.newline();
		if (node.declarations.length > 1) context.dedent();
	} else {
		join.write(', ');
	}
}
