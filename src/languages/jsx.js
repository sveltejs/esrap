/** @import { Handlers } from '../types' */
import { TSESTree } from '@typescript-eslint/types';
import js from './js.js';

/** @type {Handlers<TSESTree.Node>} */
export default {
	...js,
	JSXElement(node, context) {
		context.visit(node.openingElement);

		if (node.children.length > 0) {
			context.indent();
		}

		for (const child of node.children) {
			context.visit(child);
		}

		if (node.children.length > 0) {
			context.dedent();
		}

		if (node.closingElement) {
			context.visit(node.closingElement);
		}
	},
	JSXOpeningElement(node, context) {
		context.commands.push('<');

		context.visit(node.name);

		for (const attribute of node.attributes) {
			context.commands.push(' ');
			context.visit(attribute);
		}

		if (node.selfClosing) {
			context.commands.push(' /');
		}

		context.commands.push('>');
	},
	JSXClosingElement(node, context) {
		context.commands.push('</');

		context.visit(node.name);

		context.commands.push('>');
	},
	JSXNamespacedName(node, context) {
		context.visit(node.namespace);
		context.commands.push(':');
		context.visit(node.name);
	},
	JSXIdentifier(node, context) {
		context.commands.push(node.name);
	},
	JSXMemberExpression(node, context) {
		context.visit(node.object);
		context.commands.push('.');
		context.visit(node.property);
	},
	JSXText(node, context) {
		context.commands.push(node.value);
	},
	JSXAttribute(node, context) {
		context.visit(node.name);
		if (node.value) {
			context.commands.push('=');
			context.visit(node.value);
		}
	},
	JSXEmptyExpression(node, context) {},
	JSXFragment(node, context) {
		context.visit(node.openingFragment);

		if (node.children.length > 0) {
			context.indent();
		}

		for (const child of node.children) {
			context.visit(child);
		}

		if (node.children.length > 0) {
			context.dedent();
		}

		context.visit(node.closingFragment);
	},
	JSXOpeningFragment(node, context) {
		context.commands.push('<>');
	},
	JSXClosingFragment(node, context) {
		context.commands.push('</>');
	},
	JSXExpressionContainer(node, context) {
		context.commands.push('{');

		context.visit(node.expression);

		context.commands.push('}');
	},
	JSXSpreadChild(node, context) {
		context.commands.push('{...');

		context.visit(node.expression);

		context.commands.push('}');
	},
	JSXSpreadAttribute(node, context) {
		context.commands.push('{...');

		context.visit(node.argument);

		context.commands.push('}');
	}
};
