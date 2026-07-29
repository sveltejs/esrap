type Imported = import('pkg').Value<string>;

interface Derived extends Base<string> {}

class Implementation implements Contract<string> {}