class A {
	x?: number;
}

class B {
	x!: number;
}

class C {
	readonly x = 1;
}

class D {
	declare x: number;
}

class E extends F {
	override y = 1;
}

class G {
	public static readonly x = 1;
}