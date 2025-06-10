import {
	sequence,
	handle,
	EXPRESSIONS_PRECEDENCE,
	dedent,
	newline,
	indent,
	handle_body
} from '../handlers';
/** @import { Handlers } from '../types' */

/**
 * @type {Handlers}
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
		handle(node.elementType, state);
		state.commands.push('[]');
	},
	TSTypeAnnotation(node, state) {
		state.commands.push(': ');
		handle(node.typeAnnotation, state);
	},
	TSTypeLiteral(node, state) {
		state.commands.push('{ ');
		sequence(node.members, state, false, handle, ';');
		state.commands.push(' }');
	},
	TSPropertySignature(node, state) {
		handle(node.key, state);
		if (node.optional) state.commands.push('?');
		if (node.typeAnnotation) handle(node.typeAnnotation, state);
	},
	TSTypeReference(node, state) {
		handle(node.typeName, state);

		if (node.typeArguments) {
			handle(node.typeArguments, state);
		}
	},
	//@ts-expect-error I don't know why, but this is relied upon in the tests, but doesn't exist in the TSESTree types
	TSExpressionWithTypeArguments(node, state) {
		handle(node.expression, state);
	},
	TSTypeParameterInstantiation(node, state) {
		state.commands.push('<');
		for (let i = 0; i < node.params.length; i++) {
			handle(node.params[i], state);
			if (i != node.params.length - 1) state.commands.push(', ');
		}
		state.commands.push('>');
	},
	TSTypeParameterDeclaration(node, state) {
		state.commands.push('<');
		for (let i = 0; i < node.params.length; i++) {
			handle(node.params[i], state);
			if (i != node.params.length - 1) state.commands.push(', ');
		}
		state.commands.push('>');
	},
	TSTypeParameter(node, state) {
		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		state.commands.push(node.name);

		if (node.constraint) {
			state.commands.push(' extends ');
			handle(node.constraint, state);
		}
	},
	TSTypeQuery(node, state) {
		state.commands.push('typeof ');
		handle(node.exprName, state);
	},
	TSEnumMember(node, state) {
		handle(node.id, state);
		if (node.initializer) {
			state.commands.push(' = ');
			handle(node.initializer, state);
		}
	},
	TSFunctionType(node, state) {
		if (node.typeParameters) handle(node.typeParameters, state);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parameters = node.parameters;
		state.commands.push('(');
		sequence(parameters, state, false, handle);

		state.commands.push(') => ');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		handle(node.typeAnnotation.typeAnnotation, state);
	},
	TSIndexSignature(node, state) {
		const indexParameters = node.parameters;
		state.commands.push('[');
		sequence(indexParameters, state, false, handle);
		state.commands.push(']');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		handle(node.typeAnnotation, state);
	},
	TSMethodSignature(node, state) {
		handle(node.key, state);

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		const parametersSignature = node.parameters;
		state.commands.push('(');
		sequence(parametersSignature, state, false, handle);
		state.commands.push(')');

		// @ts-expect-error `acorn-typescript` and `@typescript-eslint/types` have slightly different type definitions
		handle(node.typeAnnotation, state);
	},
	TSTupleType(node, state) {
		state.commands.push('[');
		sequence(node.elementTypes, state, false, handle);
		state.commands.push(']');
	},
	TSNamedTupleMember(node, state) {
		handle(node.label, state);
		state.commands.push(': ');
		handle(node.elementType, state);
	},
	TSUnionType(node, state) {
		sequence(node.types, state, false, handle, ' |');
	},
	TSIntersectionType(node, state) {
		sequence(node.types, state, false, handle, ' &');
	},
	TSLiteralType(node, state) {
		handle(node.literal, state);
	},
	TSConditionalType(node, state) {
		handle(node.checkType, state);
		state.commands.push(' extends ');
		handle(node.extendsType, state);
		state.commands.push(' ? ');
		handle(node.trueType, state);
		state.commands.push(' : ');
		handle(node.falseType, state);
	},
	TSIndexedAccessType(node, state) {
		handle(node.objectType, state);
		state.commands.push('[');
		handle(node.indexType, state);
		state.commands.push(']');
	},
	TSImportType(node, state) {
		state.commands.push('import(');
		handle(node.argument, state);
		state.commands.push(')');

		if (node.qualifier) {
			state.commands.push('.');
			handle(node.qualifier, state);
		}
	},

	TSAsExpression(node, state) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSAsExpression;

			if (needs_parens) {
				state.commands.push('(');
				handle(node.expression, state);
				state.commands.push(')');
			} else {
				handle(node.expression, state);
			}
		}
		state.commands.push(' as ');
		handle(node.typeAnnotation, state);
	},

	TSEnumDeclaration(node, state) {
		state.commands.push('enum ');
		handle(node.id, state);
		state.commands.push(' {', indent, newline);
		sequence(node.members, state, false, handle);
		state.commands.push(dedent, newline, '}', newline);
	},

	TSModuleBlock(node, state) {
		state.commands.push(' {', indent, newline);
		handle_body(node.body, state);
		state.commands.push(dedent, newline, '}');
	},

	TSModuleDeclaration(node, state) {
		if (node.declare) state.commands.push('declare ');
		else state.commands.push('namespace ');

		handle(node.id, state);

		if (!node.body) return;
		handle(node.body, state);
	},

	TSNonNullExpression(node, state) {
		handle(node.expression, state);
		state.commands.push('!');
	},

	TSInterfaceBody(node, state) {
		sequence(node.body, state, true, handle, ';');
	},

	TSInterfaceDeclaration(node, state) {
		state.commands.push('interface ');
		handle(node.id, state);
		if (node.typeParameters) handle(node.typeParameters, state);
		if (node.extends) {
			state.commands.push(' extends ');
			sequence(node.extends, state, false, handle);
		}
		state.commands.push(' {');
		handle(node.body, state);
		state.commands.push('}');
	},

	TSSatisfiesExpression(node, state) {
		if (node.expression) {
			const needs_parens =
				EXPRESSIONS_PRECEDENCE[node.expression.type] < EXPRESSIONS_PRECEDENCE.TSSatisfiesExpression;

			if (needs_parens) {
				state.commands.push('(');
				handle(node.expression, state);
				state.commands.push(')');
			} else {
				handle(node.expression, state);
			}
		}
		state.commands.push(' satisfies ');
		handle(node.typeAnnotation, state);
	},

	TSTypeAliasDeclaration(node, state) {
		state.commands.push('type ');
		handle(node.id, state);
		if (node.typeParameters) handle(node.typeParameters, state);
		state.commands.push(' = ');
		handle(node.typeAnnotation, state);
		state.commands.push(';');
	},

	TSQualifiedName(node, state) {
		handle(node.left, state);
		state.commands.push('.');
		handle(node.right, state);
	}
};
