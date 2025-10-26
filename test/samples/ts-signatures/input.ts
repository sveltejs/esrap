interface Constructable {
	new (): any;
	new (value: string): MyClass;
	new <T>(value: T): GenericClass<T>;
	(name: string): string;
}

type Constructor = {
	new (): object;
	new (name: string, age: number): Person;
};
