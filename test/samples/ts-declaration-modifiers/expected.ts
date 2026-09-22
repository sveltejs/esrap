const enum Constant {
	value
}

declare enum Ambient {
	value
}

import type Imported = require('pkg');

type Constructor = abstract new <T>(value: T) => T;