{
	class /** @type {any} */ C {}
}

{
	const C = class /** @type {any} */ Named {};
}

{
	outer: while (true) {
		break /** @type {any} */ outer;
	}
}

{
	outer: while (true) {
		continue /** @type {any} */ outer;
	}
}

{
	const x = obj./** @type {any} */ prop;
}

{
	const x = obj?./** @type {any} */ prop;
}

{
	const x = import./** @type {any} */ meta;
}

{
	const x = { get /** @type {any} */ value() {} };
}

{
	const x = { async /** @type {any} */ method() {} };
}

{
	class C {
		*/** @type {any} */ method() {}
	}
}

{
	class C {
		static /** @type {any} */ field;
	}
}

{
	({ key: /** @type {any} */ [value] } = obj);
}

{
	({ key: /** @type {any} */ { value } } = obj);
}

{
	({ key: [/** @type {any} */ ...rest] } = obj);
}

{
	for (/** @type {any} */ [value] of values) {}
}

{
	for (/** @type {any} */ { value } in values) {}
}

{
	const x = tag/** @type {any} */ `text`;
}