!(0 as number);
-(0 as number);
~(0 as number);
typeof (0 as any);
void (0 as any);
1 + (0 as number);
2 * (0 as number);
1 ** (0n as any);
1 & (0 as number);
(0 as number) ** 2;
(0 as number) & 1;
(0 as number) | 1;
0 as number + 1;
(0 as number)!;
a && b as C;
a as C && b;
!(0 satisfies number);
1 ** (0n satisfies any);
1 + (0 satisfies number);
(0 satisfies number)!;

async function f() {
	await (0 as any);
	await (0 satisfies number);
	(await x)!;
}