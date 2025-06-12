/** @import { Handlers } from '../types.js' */
import { TSESTree } from '@typescript-eslint/types';
import { sequence, EXPRESSIONS_PRECEDENCE, newline, handle_body } from '../handlers.js';

/**
 * @type {Handlers<TSESTree.Node>}
 */
export default {
	TSNumberKeyword(node, state) {
		state.commands.push('number');
	},
	TSStringKeyword(node, state) {
		state.commands.push('string');
	},
	TSBooleanKeyword(node, state) {
		state.commands.push('boolean');
	},
	TSAnyKeyword(node, state) {
		state.commands.push('any');
	},
	TSVoidKeyword(node, state) {
		state.commands.push('void');
	},
	TSUnknownKeyword(node, state) {
		state.commands.push('unknown');
	},
	TSNeverKeyword(node, state) {
		state.commands.push('never');
	},
	TSSymbolKeyword(node, state) {
		state.commands.push('symbol');
	},
	TSNullKeyword(node, state) {
		state.commands.push('null');
	},
	TSUndefinedKeyword(node, state) {
		state.commands.push('undefined');
	},
	TSArrayType(node, state) {
		state.visit(node.elementType);
		state.commands.push('[]');
	},
	TSTypeAnnotation(node, state) {
		state.commands.push(': ');
		state.visit(node.typeAnnotation);
	},
	TSTypeLiteral(node, state) {
		state.commands.push('{ ');
		sequence(node.members, state, false, ';');
		state.commands.push(' }');
	},
	TSPropertySignature(node, state) {
		state.visit(node.key);
		if (node.optional) state.commands.push('?');
		if (node.typeAnnotation) state.visit(node.typeAnnotation);
	},
	TSTypeReference(node, state) {
		state.visit(node.typeName);

		if (node.typeArguments) {
			state.visit(node.typeArguments);
		}
	},
	//@ts-expect-error I don't know why, but this is relied upon in the tests, but doesn't exist in the TSESTree types
	TSExpressionWithTypeArguments(node, state) {
		state.visit(node.expression);
	},
	TSTypeParameterInstantiation(node, state) {
		state.commands.push('<');
		for (let i = 0; i < node.params.length; i++) {
			state.visit(node.params[i]);
			if (i != node.params.length - 1) state.commands.push(', ');
		}
		state.commands.push('>');
	},
	TSTypeParameterDeclaration(node, state) {
		state.commands.push('<');
		for (let i = 0; i < node.params.length; i++) {
			state.visit(node.params[i]);
			if (i != node.params.length - 1) state.commands.push(', ');
		}
		state.commands.push('>');
	},
	TSTypeParameter(node, state) {
		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		state.commands.push(node.name);

		if (node.constraint) {
			state.commands.push(' extends ');
			state.visit(node.constraint);
		}
	},
	TSTypeQuery(node, state) {
		state.commands.push('typeof ');
		state.visit(node.exprName);
	},
	TSEnumMember(node, state) {
		state.visit(node.id);
		if (node.initializer) {
			state.commands.push(' = ');
			state.visit(node.initializer);
		}
	},
	TSFunctionType(node, state) {
		if (node.typeParameters) state.visit(node.typeParameters);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parameters = node.parameters;
		state.commands.push('(');
		sequence(parameters, state, false);

		state.commands.push(') => ');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		state.visit(node.typeAnnotation.typeAnnotation);
	},
	TSIndexSignature(node, state) {
		const indexParameters = node.parameters;
		state.commands.push('[');
		sequence(indexParameters, state, false);
		state.commands.push(']');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		state.visit(node.typeAnnotation);
	},
	TSMethodSignature(node, state) {
		state.visit(node.key);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parametersSignature = node.parameters;
		state.commands.push('(');
		sequence(parametersSignature, state, false);
		state.commands.push(')');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		state.visit(node.typeAnnotation);
	},
	TSTupleType(node, state) {
		state.commands.push('[');
		sequence(node.elementTypes, state, false);
		state.commands.push(']');
	},
	TSNamedTupleMember(node, state) {
		state.visit(node.label);
		state.commands.push(': ');
		state.visit(node.elementType);
	},
	TSUnionType(node, state) {
		sequence(node.types, state, false, ' |');
	},
	TSIntersectionType(node, state) {
		sequence(node.types, state, false, ' &');
	},
	TSLiteralType(node, state) {
		state.visit(node.literal);
	},
	TSConditionalType(node, state) {
		state.visit(node.checkType);
		state.commands.push(' extends ');
		state.visit(node.extendsType);
		state.commands.push(' ? ');
		state.visit(node.trueType);
		state.commands.push(' : ');
		state.visit(node.falseType);
	},
	TSIndexedAccessType(node, state) {
		state.visit(node.objectType);
		state.commands.push('[');
		state.visit(node.indexType);
		state.commands.push(']');
	},
	TSImportType(node, state) {
		state.commands.push('import(');
		state.visit(node.argument);
		state.commands.push(')');

		if (node.qualifier) {
			state.commands.push('.');
			state.visit(node.qualifier);
		}
	},

	TSAsExpression(node, state) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSAsExpression;

			if (needs_parens) {
				state.commands.push('(');
				state.visit(node.expression);
				state.commands.push(')');
			} else {
				state.visit(node.expression);
			}
		}
		state.commands.push(' as ');
		state.visit(node.typeAnnotation);
	},

	TSEnumDeclaration(node, state) {
		state.commands.push('enum ');
		state.visit(node.id);
		state.commands.push(' {');
		state.indent();
		state.commands.push(newline);
		sequence(node.members, state, false);
		state.dedent();
		state.commands.push(newline, '}', newline);
	},

	TSModuleBlock(node, state) {
		state.commands.push(' {');
		state.indent();
		state.commands.push(newline);
		handle_body(node.body, state);
		state.dedent();
		state.commands.push(newline, '}');
	},

	TSModuleDeclaration(node, state) {
		if (node.declare) state.commands.push('declare ');
		else state.commands.push('namespace ');

		state.visit(node.id);

		if (!node.body) return;
		state.visit(node.body);
	},

	TSNonNullExpression(node, state) {
		state.visit(node.expression);
		state.commands.push('!');
	},

	TSInterfaceBody(node, state) {
		sequence(node.body, state, true, ';');
	},

	TSInterfaceDeclaration(node, state) {
		state.commands.push('interface ');
		state.visit(node.id);
		if (node.typeParameters) state.visit(node.typeParameters);
		if (node.extends) {
			state.commands.push(' extends ');
			sequence(node.extends, state, false);
		}
		state.commands.push(' {');
		state.visit(node.body);
		state.commands.push('}');
	},

	TSSatisfiesExpression(node, state) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSSatisfiesExpression;

			if (needs_parens) {
				state.commands.push('(');
				state.visit(node.expression);
				state.commands.push(')');
			} else {
				state.visit(node.expression);
			}
		}
		state.commands.push(' satisfies ');
		state.visit(node.typeAnnotation);
	},

	TSTypeAliasDeclaration(node, state) {
		state.commands.push('type ');
		state.visit(node.id);
		if (node.typeParameters) state.visit(node.typeParameters);
		state.commands.push(' = ');
		state.visit(node.typeAnnotation);
		state.commands.push(';');
	},

	TSQualifiedName(node, state) {
		state.visit(node.left);
		state.commands.push('.');
		state.visit(node.right);
	}
};
