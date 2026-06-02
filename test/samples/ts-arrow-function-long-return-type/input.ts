const toNode = (
	kind: string
): { kind: 'logical'; value: string } | { kind: 'binary'; value: number } =>
	kind === 'and' ? { kind: 'logical', value: kind } : { kind: 'binary', value: 1 };
