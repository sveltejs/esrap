class Entity {
	constructor(
		private readonly name: string,
		private readonly info: boolean
	) {}
}

@Entity('users', { info: true })
class User {}

const u = new User(); // will print "random uuid..."
