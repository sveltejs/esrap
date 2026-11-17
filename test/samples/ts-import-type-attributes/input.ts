type A = import("foo", { with: { type: "json" } });
type B = import("x", { assert: { type: "json" } });
type C = import("pkg", { with: { "resolution-mode": "require" } }).Mode<string>;
type D = import("m", { with: { type: "json" } }).Ns.Deep<number>;
type E = typeof import("foo", { with: { type: "json" } });
type F = import("plain");
