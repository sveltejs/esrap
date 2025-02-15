type A = [x: number, y: string];
type B = { a: string; b: number };

type C = 'foo' | 'bar';
type D = C | A | B | 'foobar';

type E = A & B;
type F = C & 'foobar';

type Bird = { legs: 2 };
type Dog = { legs: 4 };
type Wolf = { legs: 4 };
type Animals = Bird | Dog | Wolf;
type HasFourLegs<Animal> = Animal extends { legs: 4 } ? Animal : never;
type FourLegs = HasFourLegs<Animals>;
