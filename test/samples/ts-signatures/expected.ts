interface Constructable {
	new(): any;
	new(value: string): MyClass;
	new<T>(value: T): GenericClass<T>;
	(name: string): string
}

interface Signatures { [Symbol.iterator](): number; x(): void; [k: string]: number }

type Constructor = { new(): object; new(name: string, age: number): Person };
type Computed = { [Symbol.iterator](): number };