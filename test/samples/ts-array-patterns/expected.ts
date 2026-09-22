const [a, b]: string[] = ['foo', 'bar'];

function fn([first, second]: number[]) {
	return first + second;
}