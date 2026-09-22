declare global {
	namespace App {
		interface Error { foo: string }
	}
}

namespace A.B.C {
	export const x = 1;
}

namespace D {
	export const x = 1;
}

export {};