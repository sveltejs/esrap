export function overloaded(value: string): string;
export function overloaded(value: number): number;
export function overloaded(value: any) {
	return value;
}

declare function ambient(value: string): void;
