{
	type /** @type {any} */ T = string;
}

{
	type T = typeof /** @type {any} */ value;
}

{
	type T = ns./** @type {any} */ Value;
}

{
	type T = import(/** @type {any} */ "mod").Value;
}

{
	enum /** @type {any} */ E { Value }
}

{
	enum E { /** @type {any} */ Value }
}

namespace /** @type {any} */ N {}

{
	interface /** @type {any} */ I {}
}

{
	interface I extends /** @type {any} */ Base {}
}

{
	class C implements /** @type {any} */ Base {}
}

{
	function f(x: unknown): x is /** @type {any} */ Value {}
}

{
	type T = [/** @type {any} */ label: string];
}

{
	type T = [/** @type {any} */ label?: string];
}

{
	interface I { readonly /** @type {any} */ value: string }
}
