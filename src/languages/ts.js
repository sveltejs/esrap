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
		context.write('number', node);
	},
	TSStringKeyword(node, context) {
		context.write('string', node);
	},
	TSBooleanKeyword(node, context) {
		context.write('boolean', node);
	},
	TSAnyKeyword(node, context) {
		context.write('any', node);
	},
	TSVoidKeyword(node, context) {
		context.write('void', node);
	},
	TSUnknownKeyword(node, context) {
		context.write('unknown', node);
	},
	TSNeverKeyword(node, context) {
		context.write('never', node);
	},
	TSSymbolKeyword(node, context) {
		context.write('symbol', node);
	},
	TSNullKeyword(node, context) {
		context.write('null', node);
	},
	TSUndefinedKeyword(node, context) {
		context.write('undefined', node);
	},
	TSArrayType(node, context) {
		context.visit(node.elementType);
		context.write('[]');
	},
	TSTypeAnnotation(node, context) {
		context.write(': ');
		context.visit(node.typeAnnotation);
	},
	TSTypeLiteral(node, context) {
		context.write('{ ');
		context.inline(node.members, false, ';');
		context.write(' }');
	},
	TSPropertySignature(node, context) {
		context.visit(node.key);
		if (node.optional) context.write('?');
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
		context.write('<');
		for (let i = 0; i < node.params.length; i++) {
			context.visit(node.params[i]);
			if (i != node.params.length - 1) context.write(', ');
		}
		context.write('>');
	},
	TSTypeParameterDeclaration(node, context) {
		context.write('<');
		for (let i = 0; i < node.params.length; i++) {
			context.visit(node.params[i]);
			if (i != node.params.length - 1) context.write(', ');
		}
		context.write('>');
	},
	TSTypeParameter(node, context) {
		// @ts-expect-error type mismatch TSESTree and acorn-typescript?
		context.write(node.name, node);

		if (node.constraint) {
			context.write(' extends ');
			context.visit(node.constraint);
		}
	},
	TSTypeQuery(node, context) {
		context.write('typeof ');
		context.visit(node.exprName);
	},
	TSEnumMember(node, context) {
		context.visit(node.id);
		if (node.initializer) {
			context.write(' = ');
			context.visit(node.initializer);
		}
	},
	TSFunctionType(node, context) {
		if (node.typeParameters) context.visit(node.typeParameters);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parameters = node.parameters;
		context.write('(');
		context.inline(parameters, false);

		context.write(') => ');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.visit(node.typeAnnotation.typeAnnotation);
	},
	TSIndexSignature(node, context) {
		const indexParameters = node.parameters;
		context.write('[');
		context.inline(indexParameters, false);
		context.write(']');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.visit(node.typeAnnotation);
	},
	TSMethodSignature(node, context) {
		context.visit(node.key);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parametersSignature = node.parameters;
		context.write('(');
		context.inline(parametersSignature, false);
		context.write(')');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		context.visit(node.typeAnnotation);
	},
	TSTupleType(node, context) {
		context.write('[');
		context.inline(node.elementTypes, false);
		context.write(']');
	},
	TSNamedTupleMember(node, context) {
		context.visit(node.label);
		context.write(': ');
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
		context.write(' extends ');
		context.visit(node.extendsType);
		context.write(' ? ');
		context.visit(node.trueType);
		context.write(' : ');
		context.visit(node.falseType);
	},
	TSIndexedAccessType(node, context) {
		context.visit(node.objectType);
		context.write('[');
		context.visit(node.indexType);
		context.write(']');
	},
	TSImportType(node, context) {
		context.write('import(');
		context.visit(node.argument);
		context.write(')');

		if (node.qualifier) {
			context.write('.');
			context.visit(node.qualifier);
		}
	},

	TSAsExpression(node, context) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSAsExpression;

			if (needs_parens) {
				context.write('(');
				context.visit(node.expression);
				context.write(')');
			} else {
				context.visit(node.expression);
			}
		}
		context.write(' as ');
		context.visit(node.typeAnnotation);
	},

	TSEnumDeclaration(node, context) {
		context.write('enum ');
		context.visit(node.id);
		context.write(' {');
		context.indent();
		context.newline();
		context.inline(node.members, false);
		context.dedent();
		context.newline();
		context.write('}');
		context.newline();
	},

	TSModuleBlock(node, context) {
		context.write(' {');
		context.indent();
		context.newline();
		context.block(node.body);
		context.dedent();
		context.newline();
		context.write('}');
	},

	TSModuleDeclaration(node, context) {
		if (node.declare) context.write('declare ');
		else context.write('namespace ');

		context.visit(node.id);

		if (!node.body) return;
		context.visit(node.body);
	},

	TSNonNullExpression(node, context) {
		context.visit(node.expression);
		context.write('!');
	},

	TSInterfaceBody(node, context) {
		context.inline(node.body, true, ';');
	},

	TSInterfaceDeclaration(node, context) {
		context.write('interface ');
		context.visit(node.id);
		if (node.typeParameters) context.visit(node.typeParameters);
		if (node.extends) {
			context.write(' extends ');
			context.inline(node.extends, false);
		}
		context.write(' {');
		context.visit(node.body);
		context.write('}');
	},

	TSSatisfiesExpression(node, context) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSSatisfiesExpression;

			if (needs_parens) {
				context.write('(');
				context.visit(node.expression);
				context.write(')');
			} else {
				context.visit(node.expression);
			}
		}
		context.write(' satisfies ');
		context.visit(node.typeAnnotation);
	},

	TSTypeAliasDeclaration(node, context) {
		context.write('type ');
		context.visit(node.id);
		if (node.typeParameters) context.visit(node.typeParameters);
		context.write(' = ');
		context.visit(node.typeAnnotation);
		context.write(';');
	},

	TSQualifiedName(node, context) {
		context.visit(node.left);
		context.write('.');
		context.visit(node.right);
	}
};
