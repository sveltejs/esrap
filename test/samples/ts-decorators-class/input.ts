export class Entity {
	constructor(
		private readonly name: string,
		private readonly info: boolean
	) {}
}

@Entity('users', { info: true })
export class User {}

@Entity('categories', { info: false })
class Category {}

@Entity('tasks', { info: true })
export class Task {}

@Entity('default', { info: true })
export default class Default {}

const u = new User();
const c = new Category();
const t = new Task();
