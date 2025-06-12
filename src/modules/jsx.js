/** @import { Handlers } from '../types' */
import { handle, indent, dedent, newline } from '../handlers.js';

/** @type {Handlers} */
export default {
	JSXElement(node, state) {
		handle(node.openingElement, state);

		if (node.children.length > 0) {
			state.commands.push(indent);
		}
		for (const child of node.children) {
			handle(child, state);
			if (child !== node.children.at(-1)) {
				state.commands.push(newline);
			}
		}
		if (node.children.length > 0) {
			state.commands.push(dedent);
			state.commands.push(newline);
		}

		if (node.closingElement) {
			handle(node.closingElement, state);
		}
	},
	JSXOpeningElement(node, state) {
		state.commands.push('<');

		handle(node.name, state);

		for (const attribute of node.attributes) {
			state.commands.push(' ');
			handle(attribute, state);
		}

		if (node.selfClosing) {
			state.commands.push(' /');
		}

		state.commands.push('>');
	},
	JSXClosingElement(node, state) {
		state.commands.push('</');

		handle(node.name, state);

		state.commands.push('>');
	},
	JSXNamespacedName(node, state) {
		handle(node.namespace, state);
		state.commands.push(':');
		handle(node.name, state);
	},
	JSXIdentifier(node, state) {
		state.commands.push(node.name);
	},
	JSXMemberExpression(node, state) {
		handle(node.object, state);
		state.commands.push('.');
		handle(node.property, state);
	},
	JSXText(node, state) {
		state.commands.push(node.value);
	},
	JSXAttribute(node, state) {
		handle(node.name, state);
		if (node.value) {
			state.commands.push('=');
			handle(node.value, state);
		}
	},
	JSXEmptyExpression(node, state) {},
	JSXFragment(node, state) {
		handle(node.openingFragment, state);

		if (node.children.length > 0) {
			state.commands.push(indent);
		}
		for (const child of node.children) {
			handle(child, state);

			if (child !== node.children.at(-1)) {
				state.commands.push(newline);
			}
		}
		if (node.children.length > 0) {
			state.commands.push(dedent);
		}

		handle(node.closingFragment, state);
	},
	JSXOpeningFragment(node, state) {
		state.commands.push('<>');
	},
	JSXClosingFragment(node, state) {
		state.commands.push('</>');
	},
	JSXExpressionContainer(node, state) {
		state.commands.push('{');

		handle(node.expression, state);

		state.commands.push('}');
	},
	JSXSpreadChild(node, state) {
		state.commands.push('{...');

		handle(node.expression, state);

		state.commands.push('}');
	},
	JSXSpreadAttribute(node, state) {
		state.commands.push('{...');

		handle(node.argument, state);

		state.commands.push('}');
	}
};
