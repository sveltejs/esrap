abstract class A {
	abstract foo: string;
	abstract bar: string;

	abstract get a();
	abstract set b(x: string);
	abstract baz(x: string): void;
	overloaded(): void;
	overloaded(x?: string) {}
}

class B extends A {
	override a() {
		return this.foo;
	}
}
