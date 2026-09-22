type M = { [K in keyof JSON]: K };
type R = { readonly [K in T]: V };
type O = { [K in T]?: V };
type Neg = { -readonly [K in T]-?: V };
type Pos = { +readonly [K in T]+?: V };
type As = { [K in T as `g${K & string}`]: V };
