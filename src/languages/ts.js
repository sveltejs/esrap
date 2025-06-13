/** @import { Handlers } from '../types.js' */
import { TSESTree } from '@typescript-eslint/types';
import js from './js.js';
import { EXPRESSIONS_PRECEDENCE } from './utils/precedence.js';

/**
 * @type {Handlers<TSESTree.Node>}
 */
export default {
	...js,
	TSNumberKeyword(node, context) {
		context.commands.push('number');
	},
	TSStringKeyword(node, context) {
		context.commands.push('string');
	},
	TSBooleanKeyword(node, context) {
		context.commands.push('boolean');
	},
	TSAnyKeyword(node, context) {
		context.commands.push('any');
	},
	TSVoidKeyword(node, context) {
		context.commands.push('void');
	},
	TSUnknownKeyword(node, context) {
		context.commands.push('unknown');
	},
	TSNeverKeyword(node, context) {
		context.commands.push('never');
	},
	TSSymbolKeyword(node, context) {
		context.commands.push('symbol');
	},
	TSNullKeyword(node, context) {
		context.commands.push('null');
	},
	TSUndefinedKeyword(node, context) {
		context.commands.push('undefined');
	},
	TSArrayType(node, context) {
		context.visit(node.elementType);
		context.commands.push('[]');
	},
	TSTypeAnnotation(node, context) {
		context.commands.push(': ');
		context.visit(node.typeAnnotation);
	},
	TSTypeLiteral(node, context) {
		context.commands.push('{ ');
		context.inline(node.members, false, ';');
		context.commands.push(' }');
	},
	TSPropertySignature(node, context) {
		context.visit(node.key);
		if (node.optional) context.commands.push('?');
		if (node.typeAnnotation) context.visit(node.typeAnnotation);
	},
	TSTypeReference(node, context) {
		context.visit(node.typeName);

		if (node.typeArguments) {
			context.visit(node.typeArguments);
		}
	},
	//@ts-expect-error I don't know why, but this is relied upon in the tests, but doesn't exist in the TSESTree types
	TSExpressionWithTypeArguments(node, context) {
		context.visit(node.expression);
	},
	TSTypeParameterInstantiation(node, context) {
		context.commands.push('<');
		for (let i = 0; i < node.params.length; i++) {
			context.visit(node.params[i]);
			if (i != node.params.length - 1) context.commands.push(', ');
		}
		context.commands.push('>');
	},
	TSTypeParameterDeclaration(node, context) {
		context.commands.push('<');
		for (let i = 0; i < node.params.length; i++) {
			context.visit(node.params[i]);
			if (i != node.params.length - 1) context.commands.push(', ');
		}
		context.commands.push('>');
	},
	TSTypeParameter(node, context) {
		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.commands.push(node.name);

		if (node.constraint) {
			context.commands.push(' extends ');
			context.visit(node.constraint);
		}
	},
	TSTypeQuery(node, context) {
		context.commands.push('typeof ');
		context.visit(node.exprName);
	},
	TSEnumMember(node, context) {
		context.visit(node.id);
		if (node.initializer) {
			context.commands.push(' = ');
			context.visit(node.initializer);
		}
	},
	TSFunctionType(node, context) {
		if (node.typeParameters) context.visit(node.typeParameters);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parameters = node.parameters;
		context.commands.push('(');
		context.inline(parameters, false);

		context.commands.push(') => ');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.visit(node.typeAnnotation.typeAnnotation);
	},
	TSIndexSignature(node, context) {
		const indexParameters = node.parameters;
		context.commands.push('[');
		context.inline(indexParameters, false);
		context.commands.push(']');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.visit(node.typeAnnotation);
	},
	TSMethodSignature(node, context) {
		context.visit(node.key);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parametersSignature = node.parameters;
		context.commands.push('(');
		context.inline(parametersSignature, false);
		context.commands.push(')');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.visit(node.typeAnnotation);
	},
	TSTupleType(node, context) {
		context.commands.push('[');
		context.inline(node.elementTypes, false);
		context.commands.push(']');
	},
	TSNamedTupleMember(node, context) {
		context.visit(node.label);
		context.commands.push(': ');
		context.visit(node.elementType);
	},
	TSUnionType(node, context) {
		context.inline(node.types, false, ' |');
	},
	TSIntersectionType(node, context) {
		context.inline(node.types, false, ' &');
	},
	TSLiteralType(node, context) {
		context.visit(node.literal);
	},
	TSConditionalType(node, context) {
		context.visit(node.checkType);
		context.commands.push(' extends ');
		context.visit(node.extendsType);
		context.commands.push(' ? ');
		context.visit(node.trueType);
		context.commands.push(' : ');
		context.visit(node.falseType);
	},
	TSIndexedAccessType(node, context) {
		context.visit(node.objectType);
		context.commands.push('[');
		context.visit(node.indexType);
		context.commands.push(']');
	},
	TSImportType(node, context) {
		context.commands.push('import(');
		context.visit(node.argument);
		context.commands.push(')');

		if (node.qualifier) {
			context.commands.push('.');
			context.visit(node.qualifier);
		}
	},

	TSAsExpression(node, context) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSAsExpression;

			if (needs_parens) {
				context.commands.push('(');
				context.visit(node.expression);
				context.commands.push(')');
			} else {
				context.visit(node.expression);
			}
		}
		context.commands.push(' as ');
		context.visit(node.typeAnnotation);
	},

	TSEnumDeclaration(node, context) {
		context.commands.push('enum ');
		context.visit(node.id);
		context.commands.push(' {');
		context.indent();
		context.newline();
		context.inline(node.members, false);
		context.dedent();
		context.newline();
		context.push('}');
		context.newline();
	},

	TSModuleBlock(node, context) {
		context.commands.push(' {');
		context.indent();
		context.newline();
		context.block(node.body);
		context.dedent();
		context.newline();
		context.push('}');
	},

	TSModuleDeclaration(node, context) {
		if (node.declare) context.commands.push('declare ');
		else context.commands.push('namespace ');

		context.visit(node.id);

		if (!node.body) return;
		context.visit(node.body);
	},

	TSNonNullExpression(node, context) {
		context.visit(node.expression);
		context.commands.push('!');
	},

	TSInterfaceBody(node, context) {
		context.inline(node.body, true, ';');
	},

	TSInterfaceDeclaration(node, context) {
		context.commands.push('interface ');
		context.visit(node.id);
		if (node.typeParameters) context.visit(node.typeParameters);
		if (node.extends) {
			context.commands.push(' extends ');
			context.inline(node.extends, false);
		}
		context.commands.push(' {');
		context.visit(node.body);
		context.commands.push('}');
	},

	TSSatisfiesExpression(node, context) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSSatisfiesExpression;

			if (needs_parens) {
				context.commands.push('(');
				context.visit(node.expression);
				context.commands.push(')');
			} else {
				context.visit(node.expression);
			}
		}
		context.commands.push(' satisfies ');
		context.visit(node.typeAnnotation);
	},

	TSTypeAliasDeclaration(node, context) {
		context.commands.push('type ');
		context.visit(node.id);
		if (node.typeParameters) context.visit(node.typeParameters);
		context.commands.push(' = ');
		context.visit(node.typeAnnotation);
		context.commands.push(';');
	},

	TSQualifiedName(node, context) {
		context.visit(node.left);
		context.commands.push('.');
		context.visit(node.right);
	}
};
