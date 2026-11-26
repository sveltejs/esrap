const inner = 42;

export default (async function* inner() {
	yield inner;
});