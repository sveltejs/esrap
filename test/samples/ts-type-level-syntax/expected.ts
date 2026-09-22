type Tuple = [required: string, optional?: number, ...rest: boolean[]];

interface Accessors { get value(): string; set value(next: string); method(): void }

type Instantiated = typeof identity<string>;