const as_const = [].map(() => ({ baz } as const));
const non_null = [].map(() => ({ baz: 1 }!));
const satisfies = [].map(() => (({ x: 1 }) satisfies { x: number }));
