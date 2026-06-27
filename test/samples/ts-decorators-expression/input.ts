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

@(a ? b : c)
class Conditional {}

@(a || b)
class Logical {}

@dec
class Identifier {}

@a.b.c
class Member {}

@a()
class Call {}

const u = new User();
console.log(u.id); // will print "random uuid..."
