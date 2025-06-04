class Fields {
	static uuid() {
		return function (target: any, propertyKey: string | symbol) {
			Object.defineProperty(target, propertyKey, { value: 'random uuid...', writable: true });
		};
	}
}

class User {
	@Fields.uuid()
	id: string;
}

const u = new User();
console.log(u.id); // will print "random uuid..."
