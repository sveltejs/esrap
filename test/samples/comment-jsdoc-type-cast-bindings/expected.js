{
	function f(.../** @type {any} */ rest) {}
}

{
	function f({ key: [/** @type {any} */ value] = [] } = {}) {}
}

{
	let [/** @type {any} */ value] = values;
}

{
	try {} catch({ key: /** @type {any} */ value }) {}
}