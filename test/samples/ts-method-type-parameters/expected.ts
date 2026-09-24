class A {
	m<T>(x: T): T {
		return x;
	}

	static async n<T>(): Promise<T> {}
	static constrained<T extends string = string>(x: T): T {}
	async *[method]<T>(x: T): AsyncGenerator<T> {}
	optional?<T>(x: T): T;
	overload<T>(x: T): T;
	overload(x: unknown): unknown {}
}

abstract class B {
	abstract m<T>(x: T): T;
}