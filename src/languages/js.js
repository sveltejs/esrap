/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Handlers, NodeWithComments, Context } from '../types.js' */
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

const grouped_expression_types = [
	'ImportDeclaration',
	'VariableDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration'
];

/**
 *
 * @param {{ type: string }} a
 * @param {{ type: string }} b
 */
function add_margin(a, b) {
	return (
		(grouped_expression_types.includes(b.type) || grouped_expression_types.includes(a.type)) &&
		a.type !== b.type
	);
}

export const shared = {
	/**
	 * @param {TSESTree.ArrayExpression | TSESTree.ArrayPattern} node
	 * @param {Context} context
	 */
	'ArrayExpression|ArrayPattern': (node, context) => {
		context.push('[');
		context.inline(/** @type {TSESTree.Node[]} */ (node.elements), false);
		context.push(']');
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
		// 	chunks.push(c('('));
		// }
		if (needs_parens(node.left, node, false)) {
			context.push('(');
			context.visit(node.left);
			context.push(')');
		} else {
			context.visit(node.left);
		}

		context.push(` ${node.operator} `);

		if (needs_parens(node.right, node, true)) {
			context.push('(');
			context.visit(node.right);
			context.push(')');
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
			context.push('{');
			context.location(line, column + 1);
		} else {
			context.push('{');
		}

		if (node.body.length > 0) {
			context.multiline = true;
			context.indent();
			context.newline();
			context.block(node.body, add_margin);
			context.dedent();
			context.newline();
		}

		if (node.loc) {
			const { line, column } = node.loc.end;

			context.location(line, column - 1);
			context.push('}');
			context.location(line, column);
		} else {
			context.push('}');
		}
	},

	/**
	 * @param {TSESTree.CallExpression | TSESTree.NewExpression} node
	 * @param {Context} context
	 */
	'CallExpression|NewExpression': (node, context) => {
		if (node.type === 'NewExpression') {
			context.push('new ');
		}

		const needs_parens =
			EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression ||
			(node.type === 'NewExpression' && has_call_expression(node.callee));

		if (needs_parens) {
			context.push('(');
			context.visit(node.callee);
			context.push(')');
		} else {
			context.visit(node.callee);
		}

		if (/** @type {TSESTree.CallExpression} */ (node).optional) {
			context.push('?.');
		}

		if (node.typeArguments) context.visit(node.typeArguments);

		const open = context.new();
		const join = context.new();
		const close = context.new();

		context.push('(', open.commands);

		// if the final argument is multiline, it doesn't need to force all the
		// other arguments to also be multiline
		const child_state = context.child();
		const final_state = context.child();

		for (let i = 0; i < node.arguments.length; i += 1) {
			if (i > 0) {
				if (context.comments.length > 0) {
					context.push(', ');

					while (context.comments.length) {
						const comment = /** @type {TSESTree.Comment} */ (context.comments.shift());

						context.push({ type: 'Comment', comment });

						if (comment.type === 'Line') {
							child_state.multiline = true;
							context.newline();
						} else {
							context.push(' ');
						}
					}
				} else {
					context.push(join.commands);
				}
			}

			const p = node.arguments[i];

			(i === node.arguments.length - 1 ? final_state : child_state).visit(p);
		}

		context.push(close.commands, ')');

		const multiline = child_state.multiline;

		if (multiline || final_state.multiline) {
			context.multiline = true;
		}

		if (multiline) {
			open.indent();
			open.newline();
			join.push(',');
			join.newline();
			close.dedent();
			close.newline();
		} else {
			join.push(', ');
		}
	},

	/**
	 * @param {TSESTree.ClassDeclaration | TSESTree.ClassExpression} node
	 * @param {Context} context
	 */
	'ClassDeclaration|ClassExpression': (node, context) => {
		context.push('class ');

		if (node.id) {
			context.visit(node.id);
			context.push(' ');
		}

		if (node.superClass) {
			context.push('extends ');
			context.visit(node.superClass);
			context.push(' ');
		}

		if (node.implements) {
			context.push('implements ');
			context.inline(node.implements, false);
		}

		context.visit(node.body);
	},

	/**
	 * @param {TSESTree.ForInStatement | TSESTree.ForOfStatement} node
	 * @param {Context} context
	 */
	'ForInStatement|ForOfStatement': (node, context) => {
		context.push('for ');
		if (node.type === 'ForOfStatement' && node.await) context.push('await ');
		context.push('(');

		if (node.left.type === 'VariableDeclaration') {
			handle_var_declaration(node.left, context);
		} else {
			context.visit(node.left);
		}

		context.push(node.type === 'ForInStatement' ? ` in ` : ` of `);
		context.visit(node.right);
		context.push(') ');
		context.visit(node.body);
	},

	/**
	 * @param {TSESTree.FunctionDeclaration | TSESTree.FunctionExpression} node
	 * @param {Context} context
	 */
	'FunctionDeclaration|FunctionExpression': (node, context) => {
		if (node.async) context.push('async ');
		context.push(node.generator ? 'function* ' : 'function ');
		if (node.id) context.visit(node.id);

		if (node.typeParameters) {
			context.visit(node.typeParameters);
		}

		context.push('(');
		context.inline(node.params, false);
		context.push(')');

		if (node.returnType) context.visit(node.returnType);

		context.push(' ');

		context.visit(node.body);
	},

	/**
	 * @param {TSESTree.RestElement | TSESTree.SpreadElement} node
	 * @param {Context} context
	 */
	'RestElement|SpreadElement': (node, context) => {
		context.push('...');
		context.visit(node.argument);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		if (node.typeAnnotation) context.visit(node.typeAnnotation);
	}
};

/** @type {Handlers<TSESTree.Node>} */
export default {
	ArrayExpression: shared['ArrayExpression|ArrayPattern'],

	ArrayPattern: shared['ArrayExpression|ArrayPattern'],

	ArrowFunctionExpression: (node, context) => {
		if (node.async) context.push('async ');

		context.push('(');
		context.inline(node.params, false);
		context.push(') => ');

		if (
			node.body.type === 'ObjectExpression' ||
			(node.body.type === 'AssignmentExpression' && node.body.left.type === 'ObjectPattern') ||
			(node.body.type === 'LogicalExpression' && node.body.left.type === 'ObjectExpression') ||
			(node.body.type === 'ConditionalExpression' && node.body.test.type === 'ObjectExpression')
		) {
			context.push('(');
			context.visit(node.body);
			context.push(')');
		} else {
			context.visit(node.body);
		}
	},

	AssignmentExpression(node, context) {
		context.visit(node.left);
		context.push(` ${node.operator} `);
		context.visit(node.right);
	},

	AssignmentPattern(node, context) {
		context.visit(node.left);
		context.push(' = ');
		context.visit(node.right);
	},

	AwaitExpression(node, context) {
		if (node.argument) {
			const precedence = EXPRESSIONS_PRECEDENCE[node.argument.type];

			if (precedence && precedence < EXPRESSIONS_PRECEDENCE.AwaitExpression) {
				context.push('await (');
				context.visit(node.argument);
				context.push(')');
			} else {
				context.push('await ');
				context.visit(node.argument);
			}
		} else {
			context.push('await');
		}
	},

	BinaryExpression: shared['BinaryExpression|LogicalExpression'],

	BlockStatement: shared['BlockStatement|ClassBody'],

	BreakStatement(node, context) {
		if (node.label) {
			context.push('break ');
			context.visit(node.label);
			context.push(';');
		} else {
			context.push('break;');
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
			context.push('(');
			context.visit(node.test);
			context.push(')');
		}

		const if_true = context.new();
		const if_false = context.new();

		const child_state = context.child();

		context.push(if_true.commands);
		child_state.visit(node.consequent);
		context.push(if_false.commands);
		child_state.visit(node.alternate);

		const multiline = child_state.multiline;

		if (multiline) {
			if_true.indent();
			if_true.newline();
			if_true.write('? ');
			if_false.newline();
			if_false.push(': ');
			context.dedent();
		} else {
			if_true.write(' ? ');
			if_false.write(' : ');
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
			context.push(' as ');
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
			context.push('(');
			context.visit(node.expression);
			context.push(');');
			return;
		}

		context.visit(node.expression);
		context.push(';');
	},

	ForStatement: (node, context) => {
		context.push('for (');

		if (node.init) {
			if (node.init.type === 'VariableDeclaration') {
				handle_var_declaration(node.init, context);
			} else {
				context.visit(node.init);
			}
		}

		context.push('; ');
		if (node.test) context.visit(node.test);
		context.push('; ');
		if (node.update) context.visit(node.update);

		context.push(') ');
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
		context.push('if (');
		context.visit(node.test);
		context.push(') ');
		context.visit(node.consequent);

		if (node.alternate) {
			context.push(' else ');
			context.visit(node.alternate);
		}
	},

	ImportDeclaration(node, context) {
		if (node.specifiers.length === 0) {
			context.push('import ');
			context.visit(node.source);
			context.push(';');
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

		context.push('import ');
		if (node.importKind == 'type') context.push('type ');

		if (default_specifier) {
			context.write(default_specifier.local.name, default_specifier);
			if (namespace_specifier || named_specifiers.length > 0) context.push(', ');
		}

		if (namespace_specifier) {
			context.write('* as ' + namespace_specifier.local.name, namespace_specifier);
		}

		if (named_specifiers.length > 0) {
			context.push('{');
			context.inline(named_specifiers, true);
			context.push('}');
		}

		context.push(' from ');
		context.visit(node.source);
		if (node.attributes && node.attributes.length > 0) {
			context.push(' with { ');
			for (let index = 0; index < node.attributes.length; index++) {
				const { key, value } = node.attributes[index];
				context.visit(key);
				context.push(': ');
				context.visit(value);
				if (index + 1 !== node.attributes.length) {
					context.push(', ');
				}
			}
			context.push(' }');
		}
		context.push(';');
	},

	ImportExpression(node, context) {
		context.push('import(');
		context.visit(node.source);
		//@ts-expect-error for some reason the types haven't been updated
		if (node.arguments) {
			//@ts-expect-error
			for (let index = 0; index < node.arguments.length; index++) {
				context.push(', ');
				//@ts-expect-error
				context.visit(node.arguments[index]);
			}
		}
		context.push(')');
	},

	ImportSpecifier(node, context) {
		if (node.local.name !== node.imported.name) {
			context.visit(node.imported);
			context.push(' as ');
		}

		if (node.importKind == 'type') context.push('type ');
		context.visit(node.local);
	},

	LabeledStatement(node, context) {
		context.visit(node.label);
		context.push(': ');
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
			context.push('(');
			context.visit(node.object);
			context.push(')');
		} else {
			context.visit(node.object);
		}

		if (node.computed) {
			if (node.optional) {
				context.push('?.');
			}
			context.push('[');
			context.visit(node.property);
			context.push(']');
		} else {
			context.push(node.optional ? '?.' : '.');
			context.visit(node.property);
		}
	},

	MetaProperty(node, context) {
		context.visit(node.meta);
		context.push('.');
		context.visit(node.property);
	},

	MethodDefinition(node, context) {
		if (node.decorators) {
			for (const decorator of node.decorators) {
				context.visit(decorator);
			}
		}

		if (node.static) {
			context.push('static ');
		}

		if (node.kind === 'get' || node.kind === 'set') {
			// Getter or setter
			context.push(node.kind + ' ');
		}

		if (node.value.async) {
			context.push('async ');
		}

		if (node.value.generator) {
			context.push('*');
		}

		if (node.computed) context.push('[');
		context.visit(node.key);
		if (node.computed) context.push(']');

		context.push('(');
		context.inline(node.value.params, false);
		context.push(')');

		if (node.value.returnType) context.visit(node.value.returnType);

		context.push(' ');

		if (node.value.body) context.visit(node.value.body);
	},

	NewExpression: shared['CallExpression|NewExpression'],

	ObjectExpression(node, context) {
		context.push('{');
		context.inline(node.properties, true);
		context.push('}');
	},

	ObjectPattern(node, context) {
		context.push('{');
		context.inline(node.properties, true);
		context.push('}');

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
		context.block(node.body, add_margin);
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
			if (node.kind !== 'init') context.push(node.kind + ' ');
			if (node.value.async) context.push('async ');
			if (node.value.generator) context.push('*');
			if (node.computed) context.push('[');
			context.visit(node.key);
			if (node.computed) context.push(']');
			context.push('(');
			context.inline(node.value.params, false);
			context.push(')');

			if (node.value.returnType) context.visit(node.value.returnType);

			context.push(' ');
			context.visit(node.value.body);
		} else {
			if (node.computed) context.push('[');
			if (node.kind === 'get' || node.kind === 'set') context.push(node.kind + ' ');
			context.visit(node.key);
			context.push(node.computed ? ']: ' : ': ');
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
			context.push(node.accessibility, ' ');
		}

		if (node.static) {
			context.push('static ');
		}

		if (node.computed) {
			context.push('[');
			context.visit(node.key);
			context.push(']');
		} else {
			context.visit(node.key);
		}

		if (node.typeAnnotation) {
			context.push(': ');
			context.visit(node.typeAnnotation.typeAnnotation);
		}

		if (node.value) {
			context.push(' = ');

			context.visit(node.value);
		}

		context.push(';');
	},

	RestElement: shared['RestElement|SpreadElement'],

	ReturnStatement(node, context) {
		if (node.argument) {
			const argumentWithComment = /** @type {NodeWithComments} */ (node.argument);
			const contains_comment =
				argumentWithComment.leadingComments &&
				argumentWithComment.leadingComments.some((comment) => comment.type === 'Line');

			context.push(contains_comment ? 'return (' : 'return ');
			context.visit(node.argument);
			context.push(contains_comment ? ');' : ';');
		} else {
			context.push('return;');
		}
	},

	SequenceExpression(node, context) {
		context.push('(');
		context.inline(node.expressions, false);
		context.push(')');
	},

	SpreadElement: shared['RestElement|SpreadElement'],

	StaticBlock(node, context) {
		context.indent();
		context.push('static {');
		context.newline();

		context.block(node.body, add_margin);

		context.dedent();
		context.newline();
		context.push('}');
	},

	Super(node, context) {
		context.write('super', node);
	},

	SwitchStatement(node, context) {
		context.push('switch (');
		context.visit(node.discriminant);
		context.push(') {');
		context.indent();

		let first = true;

		for (const block of node.cases) {
			if (!first) context.push('\n');
			first = false;

			if (block.test) {
				context.newline();
				context.push(`case `);
				context.visit(block.test);
				context.push(':');
			} else {
				context.newline();
				context.push(`default:`);
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
		context.push(`}`);
	},

	TaggedTemplateExpression(node, context) {
		context.visit(node.tag);
		context.visit(node.quasi);
	},

	TemplateLiteral(node, context) {
		context.push('`');

		const { quasis, expressions } = node;

		for (let i = 0; i < expressions.length; i++) {
			const raw = quasis[i].value.raw;

			context.push(raw, '${');
			context.visit(expressions[i]);
			context.push('}');

			if (/\n/.test(raw)) context.multiline = true;
		}

		const raw = quasis[quasis.length - 1].value.raw;

		context.push(raw, '`');
		if (/\n/.test(raw)) context.multiline = true;
	},

	ThisExpression(node, context) {
		context.write('this', node);
	},

	ThrowStatement(node, context) {
		context.push('throw ');
		if (node.argument) context.visit(node.argument);
		context.push(';');
	},

	TryStatement(node, context) {
		context.push('try ');
		context.visit(node.block);

		if (node.handler) {
			if (node.handler.param) {
				context.push(' catch(');
				context.visit(node.handler.param);
				context.push(') ');
			} else {
				context.push(' catch ');
			}

			context.visit(node.handler.body);
		}

		if (node.finalizer) {
			context.push(' finally ');
			context.visit(node.finalizer);
		}
	},

	UnaryExpression(node, context) {
		context.push(node.operator);

		if (node.operator.length > 1) {
			context.push(' ');
		}

		if (EXPRESSIONS_PRECEDENCE[node.argument.type] < EXPRESSIONS_PRECEDENCE.UnaryExpression) {
			context.push('(');
			context.visit(node.argument);
			context.push(')');
		} else {
			context.visit(node.argument);
		}
	},

	UpdateExpression(node, context) {
		if (node.prefix) {
			context.push(node.operator);
			context.visit(node.argument);
		} else {
			context.visit(node.argument);
			context.push(node.operator);
		}
	},

	VariableDeclaration(node, context) {
		handle_var_declaration(node, context);
		context.push(';');
	},

	VariableDeclarator(node, context) {
		context.visit(node.id);

		if (node.init) {
			context.push(' = ');
			context.visit(node.init);
		}
	},

	WhileStatement(node, context) {
		context.push('while (');
		context.visit(node.test);
		context.push(') ');
		context.visit(node.body);
	},

	WithStatement(node, context) {
		context.push('with (');
		context.visit(node.object);
		context.push(') ');
		context.visit(node.body);
	},

	YieldExpression(node, context) {
		if (node.argument) {
			context.push(node.delegate ? `yield* ` : `yield `);
			context.visit(node.argument);
		} else {
			context.push(node.delegate ? `yield*` : `yield`);
		}
	}
};

/** @satisfies {Handlers} */

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
	const index = context.commands.length;

	const open = context.new();
	const join = context.new();
	const child_context = context.child();

	context.push(`${node.kind} `, open.commands);

	let first = true;

	for (const d of node.declarations) {
		if (!first) context.commands.push(join.commands);
		first = false;

		child_context.visit(d);
	}

	const multiline =
		child_context.multiline ||
		(node.declarations.length > 1 && context.measure(context.commands, index) > 50);

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
