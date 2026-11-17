// Exposed in: both expression and declaration initializers need parentheses.
for ((key in object);;);
for (let value = (key in object);;);
for ((enabled && key in object);;);
for (let value = (enabled && key in object);;);
for ((key in object || enabled);;);
for (let value = (key in object || enabled);;);
for ((enabled ?? key in object);;);
for (let value = (enabled ?? key in object);;);
for ((key in object === true);;);
for (let value = (key in object === true);;);
for ((true === key in object);;);
for (let value = (true === key in object);;);
for ((key in object < value);;);
for (let value = (key in object < value);;);
for ((key in object ? yes : no);;);
for (let value = (key in object ? yes : no);;);
for ((enabled ? true : key in object);;);
for (let value = (enabled ? true : key in object);;);
for ((present = key in object);;);
for (let value = (present = key in object);;);
for ((present ||= key in object);;);
for (let value = (present ||= key in object);;);
for ((() => key in object);;);
for (let value = (() => key in object);;);
for ((() => () => key in object);;);
for (let value = (() => () => key in object);;);
for ((() => enabled ? true : key in object);;);
for (let value = (() => enabled ? true : key in object);;);

// Protected in: existing expression boundaries make extra parentheses redundant.
for ((check(key in object));;);
for (let value = (check(key in object));;);
for ((new Check(key in object));;);
for (let value = (new Check(key in object));;);
for (((key in object)());;);
for (let value = ((key in object)());;);
for (((key in object).value);;);
for (let value = ((key in object).value);;);
for ((object[key in other]);;);
for (let value = (object[key in other]);;);
for ((object?.[key in other]);;);
for (let value = (object?.[key in other]);;);
for ((check?.(key in object));;);
for (let value = (check?.(key in object));;);
for ((import(key in object));;);
for (let value = (import(key in object));;);
for (([key in object]);;);
for (let value = ([key in object]);;);
for (({ value: key in object });;);
for (let value = ({ value: key in object });;);
for (({ [key in object]: true });;);
for (let value = ({ [key in object]: true });;);
for ((`${key in object}`);;);
for (let value = (`${key in object}`);;);
for ((tag`${key in object}`);;);
for (let value = (tag`${key in object}`);;);
for (((key in object)``);;);
for (let value = ((key in object)``);;);
for (((key in object, value));;);
for (let value = ((key in object, value));;);
for ((!(key in object));;);
for (let value = (!(key in object));;);
for ((typeof (key in object));;);
for (let value = (typeof (key in object));;);
for ((await (key in object));;);
for (let value = (await (key in object));;);
for ((1 + (key in object));;);
for (let value = (1 + (key in object));;);
for (((key in object) + 1);;);
for (let value = ((key in object) + 1);;);
for ((value < (key in object));;);
for (let value = (value < (key in object));;);
for (((enabled && key in object) ?? value);;);
for (let value = ((enabled && key in object) ?? value);;);
for ((enabled ? key in object : false);;);
for (let value = (enabled ? key in object : false);;);
for (((flag ? key in object : false) ? yes : no);;);
for (let value = ((flag ? key in object : false) ? yes : no);;);
for ((() => ({ value: key in object }));;);
for (let value = (() => ({ value: key in object }));;);
for ((() => ({} && key in object));;);
for (let value = (() => ({} && key in object));;);
for ((() => ({} ? true : key in object));;);
for (let value = (() => ({} ? true : key in object));;);
for ((() => ({ value } = key in object));;);
for (let value = (() => ({ value } = key in object));;);
for (((value = key in object) => value);;);
for (let value = ((value = key in object) => value);;);
for ((() => {
	return key in object;
});;);
for (let value = (() => {
	return key in object;
});;);
for ((function () {
	return key in object;
});;);
for (let value = (function () {
	return key in object;
});;);
for ((class {
	value = key in object;
});;);
for (let value = (class {
	value = key in object;
});;);

// Yield arguments are checked within a generator.
function* test() {
	for (let value = (yield key in object);;);
	for (let value = (yield* key in object);;);
	for (let value = (yield check(key in object));;);
	for (let value = (yield (key in object, value));;);
}
