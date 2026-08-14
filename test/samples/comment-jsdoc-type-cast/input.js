const foo = /** @type {number} */ (1);

const bar = /** @type {number} */ (/** @type {number} */ (1));

let /** @type {string} */ baz;

function /** @type {Function} */ named(/** @type {string} */ parameter) {
	console.log(/** @type {string} */ (parameter));
}

const [/** @type {string} */ element] = array;
object./** @type {string} */ member;

class /** @type {Function} */ Named {
	/** @type {Function} */ method() {}
}
