function member(value) {
	return (// member
	value.answer);
}

function call(value) {
	return (/* call
	*/
	value());
}

function binary(value) {
	return (// binary
	value + 1);
}

function conditional(value) {
	return (// conditional
	value ? 42 : 0);
}

function optional(value) {
	return (// optional
	value?.answer);
}

function tagged(value) {
	return (// tagged
	value`answer`);
}

function sequence(value) {
	return (// sequence
	(0, value));
}

function inline(value) {
	return (/* inline */ value.answer);
}

function throwing(value) {
	throw (// throw
	value.answer);
}

function* yielding(value) {
	yield (/* yield
	*/
	value.next());

	yield* // delegate
	value.items;
}

function plain(value) {
	return value;
}

function* bare() {
	yield;

	return;
}