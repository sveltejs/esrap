export class Entity {
	constructor(
		private readonly name: string,
		private readonly info: boolean
	) {}
}

export @Entity('users', { info: true })
class User {}

@Entity('categories', { info: false })
class Category {}

export @Entity('tasks', { info: true })
class Task {}

const u = new User();
const c = new Category();
const t = new Task();