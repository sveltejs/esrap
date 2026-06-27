class A extends (B || C) {}
class B extends (cond ? B : D) {}
const C = class extends (a = b) {};
class D extends B.C {}
class E extends new B() {}
class F extends f() {}
