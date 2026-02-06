abstract class A {
	abstract foo: string;
	abstract bar: string;

	abstract get a();
	abstract set b(x: string);
}

class B extends A {
	override a() {
		return this.foo;
	}
}
