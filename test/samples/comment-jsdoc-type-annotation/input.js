let /** @type {number | undefined} */ computed;

let /** @type {number | undefined} */ a, /** @type {string} */ b;

function foo(/** @type {number} */ x, /** @type {string} */ y) {}

const fn = (/** @type {number} */ z) => z;

try {
	foo(1, '');
} catch (/** @type {any} */ e) {}

const value = /** @type {number} */ (computed);
