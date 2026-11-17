{
	enum E {
		Value = /** @type {any} */ (value)
	}
}

{
	const x = <any>/** @type {any} */ (value);
}

{
	interface I { [/** @type {any} */ (key)]: string }
}