class A {
	constructor(
		public a: number,
		protected b: string,
		readonly c?: boolean,
		public d = 1
	) {}
}

class B extends A {
	constructor(
		public override readonly a: number,
		protected override b: string,
		override readonly c?: boolean,
		override d = 2
	) {
		super(a, b, c, d);
	}
}