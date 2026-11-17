const object = {
	async *[method]<T>(value: T): AsyncGenerator<T> {},
	get [getter](): T {
		return value;
	},
	set [setter](value: T) {}
};