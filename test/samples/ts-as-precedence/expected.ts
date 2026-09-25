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
(w as any) = [1];
(w satisfies any) += 1;
(<any>w) = 1;
(Map as any)++;
++(Map as any);
(w satisfies any)--;
--(w satisfies any);
(<any>w)++;
++(<any>w);
((M.g as any)<any>)([1]);
((fn?.method)<T>)();

const f1 = (M.g satisfies any)<any>;
const f2 = (<any>M.g)<any>;
const f3 = (a ? b : c)<any>;
const f4 = (a || b)<any>;

// prettier-ignore
const asserted = (<T>x) ** y;

const tag = (x as T)`t`;

async function f() {
	await (0 as any);
	await (0 satisfies number);
	(await x)!;
}
