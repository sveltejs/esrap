class Controller {
	constructor(
		@Inject(CONFIG) private readonly config: Config,
		@Optional() @Inject(LOGGER) protected logger?: Logger,
		@Inject(CACHE) public cache = new Map(),
		@Self() service: Service
	) {}

	find(
		@Param('id') id: string,
		@Query() { limit, offset }: Paging,
		@Body() [first]: Item[]
	) {}

	update(
		@Param('id') id: string,
		@Body(validation.pipe) body: Item,
		@(flags ?? defaults) force = false
	) {}
}