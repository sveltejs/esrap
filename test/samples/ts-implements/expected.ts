interface SelectableControl { select(): void }
interface Scrollable { scroll(): void }

class Button implements SelectableControl, Scrollable {
	select() {}
}