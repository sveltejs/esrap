/** @import { TSESTree } from '@typescript-eslint/types' */
/** @import { Handlers, NodeWithComments, Context } from '../types.js' */
import {
	create_sequence,
	indent,
	newline,
	dedent,
	c,
	handle_var_declaration,
	quote,
	handle_body,
	has_call_expression,
	l,
	needs_parens
} from '../handlers.js';
import { EXPRESSIONS_PRECEDENCE } from './utils/precedence.js';

export const shared = {
	/**
	 * @param {TSESTree.ArrayExpression | TSESTree.ArrayPattern} node
	 * @param {Context} state
	 */
	'ArrayExpression|ArrayPattern': (node, state) => {
		state.push('[');
		state.sequence(/** @type {TSESTree.Node[]} */ (node.elements), false);
		state.push(']');
	},

	/**
	 * @param {TSESTree.BinaryExpression | TSESTree.LogicalExpression} node
	 * @param {Context} state
	 */
	'BinaryExpression|LogicalExpression': (node, state) => {
		// TODO
		// const is_in = node.operator === 'in';
		// if (is_in) {
		// 	// Avoids confusion in `for` loops initializers
		// 	chunks.push(c('('));
		// }
		if (needs_parens(node.left, node, false)) {
			state.push('(');
			state.visit(node.left);
			state.push(')');
		} else {
			state.visit(node.left);
		}

		state.push(` ${node.operator} `);

		if (needs_parens(node.right, node, true)) {
			state.push('(');
			state.visit(node.right);
			state.push(')');
		} else {
			state.visit(node.right);
		}
	},

	/**
	 * @param {TSESTree.BlockStatement | TSESTree.ClassBody} node
	 * @param {Context} state
	 */
	'BlockStatement|ClassBody': (node, state) => {
		if (node.loc) {
			const { line, column } = node.loc.start;
			state.push(l(line, column), '{', l(line, column + 1));
		} else {
			state.push('{');
		}

		if (node.body.length > 0) {
			state.multiline = true;
			state.indent();
			state.newline();
			handle_body(node.body, state);
			state.dedent();
			state.newline();
		}

		if (node.loc) {
			const { line, column } = node.loc.end;
			state.push(l(line, column - 1), '}', l(line, column));
		} else {
			state.push('}');
		}
	},

	/**
	 * @param {TSESTree.CallExpression | TSESTree.NewExpression} node
	 * @param {Context} state
	 */
	'CallExpression|NewExpression': (node, state) => {
		if (node.type === 'NewExpression') {
			state.push('new ');
		}

		const needs_parens =
			EXPRESSIONS_PRECEDENCE[node.callee.type] < EXPRESSIONS_PRECEDENCE.CallExpression ||
			(node.type === 'NewExpression' && has_call_expression(node.callee));

		if (needs_parens) {
			state.push('(');
			state.visit(node.callee);
			state.push(')');
		} else {
			state.visit(node.callee);
		}

		if (/** @type {TSESTree.CallExpression} */ (node).optional) {
			state.push('?.');
		}

		if (node.typeArguments) state.visit(node.typeArguments);

		const open = create_sequence();
		const join = create_sequence();
		const close = create_sequence();

		state.push('(', open);

		// if the final argument is multiline, it doesn't need to force all the
		// other arguments to also be multiline
		const child_state = state.child();
		const final_state = state.child();

		for (let i = 0; i < node.arguments.length; i += 1) {
			if (i > 0) {
				if (state.comments.length > 0) {
					state.push(', ');

					while (state.comments.length) {
						const comment = /** @type {TSESTree.Comment} */ (state.comments.shift());

						state.push({ type: 'Comment', comment });

						if (comment.type === 'Line') {
							child_state.multiline = true;
							state.newline();
						} else {
							state.push(' ');
						}
					}
				} else {
					state.push(join);
				}
			}

			const p = node.arguments[i];

			(i === node.arguments.length - 1 ? final_state : child_state).visit(p);
		}

		state.push(close, ')');

		const multiline = child_state.multiline;

		if (multiline || final_state.multiline) {
			state.multiline = true;
		}

		if (multiline) {
			open.push(indent, newline);
			join.push(',', newline);
			close.push(dedent, newline);
		} else {
			join.push(', ');
		}
	},

	/**
	 * @param {TSESTree.ClassDeclaration | TSESTree.ClassExpression} node
	 * @param {Context} state
	 */
	'ClassDeclaration|ClassExpression': (node, state) => {
		state.push('class ');

		if (node.id) {
			state.visit(node.id);
			state.push(' ');
		}

		if (node.superClass) {
			state.push('extends ');
			state.visit(node.superClass);
			state.push(' ');
		}

		if (node.implements) {
			state.push('implements ');
			state.sequence(node.implements, false);
		}

		state.visit(node.body);
	},

	/**
	 * @param {TSESTree.ForInStatement | TSESTree.ForOfStatement} node
	 * @param {Context} state
	 */
	'ForInStatement|ForOfStatement': (node, state) => {
		state.push('for ');
		if (node.type === 'ForOfStatement' && node.await) state.push('await ');
		state.push('(');

		if (node.left.type === 'VariableDeclaration') {
			handle_var_declaration(node.left, state);
		} else {
			state.visit(node.left);
		}

		state.push(node.type === 'ForInStatement' ? ` in ` : ` of `);
		state.visit(node.right);
		state.push(') ');
		state.visit(node.body);
	},

	/**
	 * @param {TSESTree.FunctionDeclaration | TSESTree.FunctionExpression} node
	 * @param {Context} state
	 */
	'FunctionDeclaration|FunctionExpression': (node, state) => {
		if (node.async) state.push('async ');
		state.push(node.generator ? 'function* ' : 'function ');
		if (node.id) state.visit(node.id);

		if (node.typeParameters) {
			state.visit(node.typeParameters);
		}

		state.push('(');
		state.sequence(node.params, false);
		state.push(')');

		if (node.returnType) state.visit(node.returnType);

		state.push(' ');

		state.visit(node.body);
	},

	/**
	 * @param {TSESTree.RestElement | TSESTree.SpreadElement} node
	 * @param {Context} state
	 */
	'RestElement|SpreadElement': (node, state) => {
		state.push('...');
		state.visit(node.argument);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		if (node.typeAnnotation) state.visit(node.typeAnnotation);
	}
};

/** @type {Handlers<TSESTree.Node>} */
export default {
	ArrayExpression: shared['ArrayExpression|ArrayPattern'],

	ArrayPattern: shared['ArrayExpression|ArrayPattern'],

	ArrowFunctionExpression: (node, state) => {
		if (node.async) state.push('async ');

		state.push('(');
		state.sequence(node.params, false);
		state.push(') => ');

		if (
			node.body.type === 'ObjectExpression' ||
			(node.body.type === 'AssignmentExpression' && node.body.left.type === 'ObjectPattern') ||
			(node.body.type === 'LogicalExpression' && node.body.left.type === 'ObjectExpression') ||
			(node.body.type === 'ConditionalExpression' && node.body.test.type === 'ObjectExpression')
		) {
			state.push('(');
			state.visit(node.body);
			state.push(')');
		} else {
			state.visit(node.body);
		}
	},

	AssignmentExpression(node, state) {
		state.visit(node.left);
		state.push(` ${node.operator} `);
		state.visit(node.right);
	},

	AssignmentPattern(node, state) {
		state.visit(node.left);
		state.push(' = ');
		state.visit(node.right);
	},

	AwaitExpression(node, state) {
		if (node.argument) {
			const precedence = EXPRESSIONS_PRECEDENCE[node.argument.type];

			if (precedence && precedence < EXPRESSIONS_PRECEDENCE.AwaitExpression) {
				state.push('await (');
				state.visit(node.argument);
				state.push(')');
			} else {
				state.push('await ');
				state.visit(node.argument);
			}
		} else {
			state.push('await');
		}
	},

	BinaryExpression: shared['BinaryExpression|LogicalExpression'],

	BlockStatement: shared['BlockStatement|ClassBody'],

	BreakStatement(node, state) {
		if (node.label) {
			state.push('break ');
			state.visit(node.label);
			state.push(';');
		} else {
			state.push('break;');
		}
	},

	CallExpression: shared['CallExpression|NewExpression'],

	ChainExpression(node, state) {
		state.visit(node.expression);
	},

	ClassBody: shared['BlockStatement|ClassBody'],

	ClassDeclaration: shared['ClassDeclaration|ClassExpression'],

	ClassExpression: shared['ClassDeclaration|ClassExpression'],

	ConditionalExpression(node, state) {
		if (EXPRESSIONS_PRECEDENCE[node.test.type] > EXPRESSIONS_PRECEDENCE.ConditionalExpression) {
			state.visit(node.test);
		} else {
			state.push('(');
			state.visit(node.test);
			state.push(')');
		}

		const if_true = create_sequence();
		const if_false = create_sequence();

		const child_state = state.child();

		state.push(if_true);
		child_state.visit(node.consequent);
		state.push(if_false);
		child_state.visit(node.alternate);

		const multiline = child_state.multiline;

		if (multiline) {
			if_true.push(indent, newline, '? ');
			if_false.push(newline, ': ');
			state.dedent();
		} else {
			if_true.push(' ? ');
			if_false.push(' : ');
		}
	},

	ContinueStatement(node, state) {
		if (node.label) {
			state.push('continue ');
			state.visit(node.label);
			state.push(';');
		} else {
			state.push('continue;');
		}
	},

	DebuggerStatement(node, state) {
		state.push(c('debugger', node), ';');
	},

	Decorator(node, state) {
		state.push('@');
		state.visit(node.expression);
		state.newline();
	},

	DoWhileStatement(node, state) {
		state.push('do ');
		state.visit(node.body);
		state.push(' while (');
		state.visit(node.test);
		state.push(');');
	},

	EmptyStatement(node, state) {
		state.push(';');
	},

	ExportAllDeclaration(node, state) {
		state.push('export * ');
		if (node.exported) {
			state.push('as ');
			state.visit(node.exported);
		}
		state.push(' from ');
		state.visit(node.source);
		state.push(';');
	},

	ExportDefaultDeclaration(node, state) {
		state.push('export default ');

		state.visit(node.declaration);

		if (node.declaration.type !== 'FunctionDeclaration') {
			state.push(';');
		}
	},

	ExportNamedDeclaration(node, state) {
		state.push('export ');

		if (node.declaration) {
			state.visit(node.declaration);
			return;
		}

		state.push('{');
		state.sequence(node.specifiers, true);
		state.push('}');

		if (node.source) {
			state.push(' from ');
			state.visit(node.source);
		}

		state.push(';');
	},

	ExportSpecifier(node, state) {
		state.visit(node.local);

		if (node.local.name !== node.exported.name) {
			state.push(' as ');
			state.visit(node.exported);
		}
	},

	ExpressionStatement(node, state) {
		if (
			node.expression.type === 'ObjectExpression' ||
			(node.expression.type === 'AssignmentExpression' &&
				node.expression.left.type === 'ObjectPattern') ||
			node.expression.type === 'FunctionExpression'
		) {
			// is an AssignmentExpression to an ObjectPattern
			state.push('(');
			state.visit(node.expression);
			state.push(');');
			return;
		}

		state.visit(node.expression);
		state.push(';');
	},

	ForStatement: (node, state) => {
		state.push('for (');

		if (node.init) {
			if (node.init.type === 'VariableDeclaration') {
				handle_var_declaration(node.init, state);
			} else {
				state.visit(node.init);
			}
		}

		state.push('; ');
		if (node.test) state.visit(node.test);
		state.push('; ');
		if (node.update) state.visit(node.update);

		state.push(') ');
		state.visit(node.body);
	},

	ForInStatement: shared['ForInStatement|ForOfStatement'],

	ForOfStatement: shared['ForInStatement|ForOfStatement'],

	FunctionDeclaration: shared['FunctionDeclaration|FunctionExpression'],

	FunctionExpression: shared['FunctionDeclaration|FunctionExpression'],

	Identifier(node, state) {
		let name = node.name;
		state.push(c(name, node));

		if (node.typeAnnotation) state.visit(node.typeAnnotation);
	},

	IfStatement(node, state) {
		state.push('if (');
		state.visit(node.test);
		state.push(') ');
		state.visit(node.consequent);

		if (node.alternate) {
			state.push(' else ');
			state.visit(node.alternate);
		}
	},

	ImportDeclaration(node, state) {
		if (node.specifiers.length === 0) {
			state.push('import ');
			state.visit(node.source);
			state.push(';');
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

		state.push('import ');
		if (node.importKind == 'type') state.push('type ');

		if (default_specifier) {
			state.push(c(default_specifier.local.name, default_specifier));
			if (namespace_specifier || named_specifiers.length > 0) state.push(', ');
		}

		if (namespace_specifier) {
			state.push(c('* as ' + namespace_specifier.local.name, namespace_specifier));
		}

		if (named_specifiers.length > 0) {
			state.push('{');
			state.sequence(named_specifiers, true);
			state.push('}');
		}

		state.push(' from ');
		state.visit(node.source);
		if (node.attributes && node.attributes.length > 0) {
			state.push(' with { ');
			for (let index = 0; index < node.attributes.length; index++) {
				const { key, value } = node.attributes[index];
				state.visit(key);
				state.push(': ');
				state.visit(value);
				if (index + 1 !== node.attributes.length) {
					state.push(', ');
				}
			}
			state.push(' }');
		}
		state.push(';');
	},

	ImportExpression(node, state) {
		state.push('import(');
		state.visit(node.source);
		//@ts-expect-error for some reason the types haven't been updated
		if (node.arguments) {
			//@ts-expect-error
			for (let index = 0; index < node.arguments.length; index++) {
				state.push(', ');
				//@ts-expect-error
				state.visit(node.arguments[index]);
			}
		}
		state.push(')');
	},

	ImportSpecifier(node, state) {
		if (node.local.name !== node.imported.name) {
			state.visit(node.imported);
			state.push(' as ');
		}

		if (node.importKind == 'type') state.push('type ');
		state.visit(node.local);
	},

	LabeledStatement(node, state) {
		state.visit(node.label);
		state.push(': ');
		state.visit(node.body);
	},

	Literal(node, state) {
		// TODO do we need to handle weird unicode characters somehow?
		// str.replace(/\\u(\d{4})/g, (m, n) => String.fromCharCode(+n))
		const value =
			node.raw ||
			(typeof node.value === 'string' ? quote(node.value, state.quote) : String(node.value));

		state.push(c(value, node));
	},

	LogicalExpression: shared['BinaryExpression|LogicalExpression'],

	MemberExpression(node, state) {
		if (EXPRESSIONS_PRECEDENCE[node.object.type] < EXPRESSIONS_PRECEDENCE.MemberExpression) {
			state.push('(');
			state.visit(node.object);
			state.push(')');
		} else {
			state.visit(node.object);
		}

		if (node.computed) {
			if (node.optional) {
				state.push('?.');
			}
			state.push('[');
			state.visit(node.property);
			state.push(']');
		} else {
			state.push(node.optional ? '?.' : '.');
			state.visit(node.property);
		}
	},

	MetaProperty(node, state) {
		state.visit(node.meta);
		state.push('.');
		state.visit(node.property);
	},

	MethodDefinition(node, state) {
		if (node.decorators) {
			for (const decorator of node.decorators) {
				state.visit(decorator);
			}
		}

		if (node.static) {
			state.push('static ');
		}

		if (node.kind === 'get' || node.kind === 'set') {
			// Getter or setter
			state.push(node.kind + ' ');
		}

		if (node.value.async) {
			state.push('async ');
		}

		if (node.value.generator) {
			state.push('*');
		}

		if (node.computed) state.push('[');
		state.visit(node.key);
		if (node.computed) state.push(']');

		state.push('(');
		state.sequence(node.value.params, false);
		state.push(')');

		if (node.value.returnType) state.visit(node.value.returnType);

		state.push(' ');

		if (node.value.body) state.visit(node.value.body);
	},

	NewExpression: shared['CallExpression|NewExpression'],

	ObjectExpression(node, state) {
		state.push('{');
		state.sequence(node.properties, true);
		state.push('}');
	},

	ObjectPattern(node, state) {
		state.push('{');
		state.sequence(node.properties, true);
		state.push('}');

		if (node.typeAnnotation) state.visit(node.typeAnnotation);
	},

	// @ts-expect-error this isn't a real node type, but Acorn produces it
	ParenthesizedExpression(node, state) {
		return state.visit(node.expression);
	},

	PrivateIdentifier(node, state) {
		state.push('#', c(node.name, node));
	},

	Program(node, state) {
		handle_body(node.body, state);
	},

	Property(node, state) {
		const value = node.value.type === 'AssignmentPattern' ? node.value.left : node.value;

		const shorthand =
			!node.computed &&
			node.kind === 'init' &&
			node.key.type === 'Identifier' &&
			value.type === 'Identifier' &&
			node.key.name === value.name;

		if (shorthand) {
			state.visit(node.value);
			return;
		}

		// shorthand methods
		if (node.value.type === 'FunctionExpression') {
			if (node.kind !== 'init') state.push(node.kind + ' ');
			if (node.value.async) state.push('async ');
			if (node.value.generator) state.push('*');
			if (node.computed) state.push('[');
			state.visit(node.key);
			if (node.computed) state.push(']');
			state.push('(');
			state.sequence(node.value.params, false);
			state.push(')');

			if (node.value.returnType) state.visit(node.value.returnType);

			state.push(' ');
			state.visit(node.value.body);
		} else {
			if (node.computed) state.push('[');
			if (node.kind === 'get' || node.kind === 'set') state.push(node.kind + ' ');
			state.visit(node.key);
			state.push(node.computed ? ']: ' : ': ');
			state.visit(node.value);
		}
	},

	PropertyDefinition(node, state) {
		if (node.decorators) {
			for (const decorator of node.decorators) {
				state.visit(decorator);
			}
		}

		if (node.accessibility) {
			state.push(node.accessibility, ' ');
		}

		if (node.static) {
			state.push('static ');
		}

		if (node.computed) {
			state.push('[');
			state.visit(node.key);
			state.push(']');
		} else {
			state.visit(node.key);
		}

		if (node.typeAnnotation) {
			state.push(': ');
			state.visit(node.typeAnnotation.typeAnnotation);
		}

		if (node.value) {
			state.push(' = ');

			state.visit(node.value);
		}

		state.push(';');
	},

	RestElement: shared['RestElement|SpreadElement'],

	ReturnStatement(node, state) {
		if (node.argument) {
			const argumentWithComment = /** @type {NodeWithComments} */ (node.argument);
			const contains_comment =
				argumentWithComment.leadingComments &&
				argumentWithComment.leadingComments.some((comment) => comment.type === 'Line');

			state.push(contains_comment ? 'return (' : 'return ');
			state.visit(node.argument);
			state.push(contains_comment ? ');' : ';');
		} else {
			state.push('return;');
		}
	},

	SequenceExpression(node, state) {
		state.push('(');
		state.sequence(node.expressions, false);
		state.push(')');
	},

	SpreadElement: shared['RestElement|SpreadElement'],

	StaticBlock(node, state) {
		state.indent();
		state.push('static {');
		state.newline();

		handle_body(node.body, state);

		state.dedent();
		state.newline();
		state.push('}');
	},

	Super(node, state) {
		state.push(c('super', node));
	},

	SwitchStatement(node, state) {
		state.push('switch (');
		state.visit(node.discriminant);
		state.push(') {');
		state.indent();

		let first = true;

		for (const block of node.cases) {
			if (!first) state.push('\n');
			first = false;

			if (block.test) {
				state.newline();
				state.push(`case `);
				state.visit(block.test);
				state.push(':');
			} else {
				state.newline();
				state.push(`default:`);
			}

			state.indent();

			for (const statement of block.consequent) {
				state.newline();
				state.visit(statement);
			}

			state.dedent();
		}

		state.dedent();
		state.newline();
		state.push(`}`);
	},

	TaggedTemplateExpression(node, state) {
		state.visit(node.tag);
		state.visit(node.quasi);
	},

	TemplateLiteral(node, state) {
		state.push('`');

		const { quasis, expressions } = node;

		for (let i = 0; i < expressions.length; i++) {
			const raw = quasis[i].value.raw;

			state.push(raw, '${');
			state.visit(expressions[i]);
			state.push('}');

			if (/\n/.test(raw)) state.multiline = true;
		}

		const raw = quasis[quasis.length - 1].value.raw;

		state.push(raw, '`');
		if (/\n/.test(raw)) state.multiline = true;
	},

	ThisExpression(node, state) {
		state.push(c('this', node));
	},

	ThrowStatement(node, state) {
		state.push('throw ');
		if (node.argument) state.visit(node.argument);
		state.push(';');
	},

	TryStatement(node, state) {
		state.push('try ');
		state.visit(node.block);

		if (node.handler) {
			if (node.handler.param) {
				state.push(' catch(');
				state.visit(node.handler.param);
				state.push(') ');
			} else {
				state.push(' catch ');
			}

			state.visit(node.handler.body);
		}

		if (node.finalizer) {
			state.push(' finally ');
			state.visit(node.finalizer);
		}
	},

	UnaryExpression(node, state) {
		state.push(node.operator);

		if (node.operator.length > 1) {
			state.push(' ');
		}

		if (EXPRESSIONS_PRECEDENCE[node.argument.type] < EXPRESSIONS_PRECEDENCE.UnaryExpression) {
			state.push('(');
			state.visit(node.argument);
			state.push(')');
		} else {
			state.visit(node.argument);
		}
	},

	UpdateExpression(node, state) {
		if (node.prefix) {
			state.push(node.operator);
			state.visit(node.argument);
		} else {
			state.visit(node.argument);
			state.push(node.operator);
		}
	},

	VariableDeclaration(node, state) {
		handle_var_declaration(node, state);
		state.push(';');
	},

	VariableDeclarator(node, state) {
		state.visit(node.id);

		if (node.init) {
			state.push(' = ');
			state.visit(node.init);
		}
	},

	WhileStatement(node, state) {
		state.push('while (');
		state.visit(node.test);
		state.push(') ');
		state.visit(node.body);
	},

	WithStatement(node, state) {
		state.push('with (');
		state.visit(node.object);
		state.push(') ');
		state.visit(node.body);
	},

	YieldExpression(node, state) {
		if (node.argument) {
			state.push(node.delegate ? `yield* ` : `yield `);
			state.visit(node.argument);
		} else {
			state.push(node.delegate ? `yield*` : `yield`);
		}
	}
}; /** @satisfies {Handlers} */
