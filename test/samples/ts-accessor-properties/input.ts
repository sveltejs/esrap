class Example {
	accessor count: number = 0;
	private accessor privateCount: number;
	public accessor publicCount: number = 5;
	protected accessor protectedCount: number;
}

abstract class AbstractExample {
	abstract accessor abstractCount: number;
	protected abstract accessor protectedAbstractCount: number;
}

class MyClass {
	constructor(
		protected x: number,
		private y: string
	) {}
}
