/** @import { Handlers } from '../types' */
import { TSESTree } from '@typescript-eslint/types';

/** @type {Handlers<TSESTree.Node>} */
export default {
	JSXElement(node, state) {
		state.visit(node.openingElement);

		if (node.children.length > 0) {
			state.indent();
		}

		for (const child of node.children) {
			state.visit(child);
		}

		if (node.children.length > 0) {
			state.dedent();
		}

		if (node.closingElement) {
			state.visit(node.closingElement);
		}
	},
	JSXOpeningElement(node, state) {
		state.commands.push('<');

		state.visit(node.name);

		for (const attribute of node.attributes) {
			state.commands.push(' ');
			state.visit(attribute);
		}

		if (node.selfClosing) {
			state.commands.push(' /');
		}

		state.commands.push('>');
	},
	JSXClosingElement(node, state) {
		state.commands.push('</');

		state.visit(node.name);

		state.commands.push('>');
	},
	JSXNamespacedName(node, state) {
		state.visit(node.namespace);
		state.commands.push(':');
		state.visit(node.name);
	},
	JSXIdentifier(node, state) {
		state.commands.push(node.name);
	},
	JSXMemberExpression(node, state) {
		state.visit(node.object);
		state.commands.push('.');
		state.visit(node.property);
	},
	JSXText(node, state) {
		state.commands.push(node.value);
	},
	JSXAttribute(node, state) {
		state.visit(node.name);
		if (node.value) {
			state.commands.push('=');
			state.visit(node.value);
		}
	},
	JSXEmptyExpression(node, state) {},
	JSXFragment(node, state) {
		state.visit(node.openingFragment);

		if (node.children.length > 0) {
			state.indent();
		}

		for (const child of node.children) {
			state.visit(child);
		}

		if (node.children.length > 0) {
			state.dedent();
		}

		state.visit(node.closingFragment);
	},
	JSXOpeningFragment(node, state) {
		state.commands.push('<>');
	},
	JSXClosingFragment(node, state) {
		state.commands.push('</>');
	},
	JSXExpressionContainer(node, state) {
		state.commands.push('{');

		state.visit(node.expression);

		state.commands.push('}');
	},
	JSXSpreadChild(node, state) {
		state.commands.push('{...');

		state.visit(node.expression);

		state.commands.push('}');
	},
	JSXSpreadAttribute(node, state) {
		state.commands.push('{...');

		state.visit(node.argument);

		state.commands.push('}');
	}
};
