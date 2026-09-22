type Event = `on${string}`;
type Path<T extends string> = `/${T}/index.html`;
type Plain = `static_string`;
type Multi<A extends string, B extends string> = `prefix_${A}_middle_${B}_suffix`;