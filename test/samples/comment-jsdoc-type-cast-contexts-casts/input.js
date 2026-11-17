{
	const x = /** @type {any} */ (value);
}

{
	function f(value = /** @type {any} */ (other)) {}
}

{
	const { key: value = /** @type {any} */ (other) } = obj;
}

{
	const x = obj[/** @type {any} */ (key)];
}

{
	const x = obj?.[/** @type {any} */ (key)];
}

{
	const x = { [/** @type {any} */ (key)]: value };
}

{
	class C { [/** @type {any} */ (key)]() {} }
}

{
	const x = import(/** @type {any} */ (source));
}

{
	const x = (/** @type {any} */ (obj?.a)).b;
}

{
	const x = (/** @type {any} */ (obj?.m))();
}

{
	const x = obj?.m(/** @type {any} */ (arg));
}

{
	++/** @type {any} */ (value);
}

{
	({ key: /** @type {any} */ (value) } = obj);
}

{
	const obj = { value: /** @type {any} */ (value) };
}

{
	({ value: /** @type {any} */ (value) } = obj);
}

// Regressions for the workarounds in
// https://github.com/sveltia/sveltia-cms/commit/6dcfa93ef38f01271e3b4f3fcbef9f6aa88dabc3
{
	await render(AccountMenu, { menuButton: /** @type {any} */ (menuButton) });
}

{
	subfolderPaths.map((path) => getFolderPublicPath({ folder: /** @type {AssetFolderInfo} */ (folder), subfolderPath: path }));
}

{
	auth.magicLinkConfirmation = { account: /** @type {User} */ (account), resolve };
}
