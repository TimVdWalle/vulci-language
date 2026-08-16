// Phase 13

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateStructSource as evaluate } from "./struct-test-helpers.ts";

test("methods mutate their receiver through implicit self", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn increment(int amount) returns int {
    self.value = self.value + amount
    self.value
  }
}
$counter = Counter(value: 1)
$counter.increment(2)
$counter.value`),
    { type: "Integer", value: 3 },
  );
});

test("methods support named and defaulted arguments", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn add(int amount = 1) returns int {
    self.value = self.value + amount
    self.value
  }
}
$counter = Counter(value: 1)
$counter.add()
$counter.add(amount: 40)`),
    { type: "Integer", value: 42 },
  );
});

test("methods may call other methods on self", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn increment() returns int {
    self.value = self.value + 1
    self.value
  }
  fn increment_twice() returns int {
    self.increment()
    self.increment()
  }
}
$counter = Counter(value: 0)
$counter.increment_twice()
$counter.value`),
    { type: "Integer", value: 2 },
  );
});

test("method calls on nested struct fields mutate the nested receiver", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn increment() returns int {
    self.value = self.value + 1
    self.value
  }
}
struct Holder {
  Counter counter
}
$holder = Holder(counter: Counter(value: 1))
$holder.counter.increment()
$holder.counter.value`),
    { type: "Integer", value: 2 },
  );
});

test("self behaves as a normal struct value when assigned", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn copied_value() returns int {
    copy = self
    copy.value = 99
    self.value
  }
}
$counter = Counter(value: 1)
$counter.copied_value()`),
    { type: "Integer", value: 1 },
  );
});

test("passing self to a function uses normal value semantics", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
}
fn changed(Counter counter) returns Counter {
  counter.value = 99
  counter
}
struct Wrapper {
  Counter counter
  fn unchanged() returns int {
    changed(self.counter)
    self.counter.value
  }
}
Wrapper(counter: Counter(value: 1)).unchanged()`),
    { type: "Integer", value: 1 },
  );
});

test("methods may return self", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn copy() returns Counter {
    self
  }
}
$original = Counter(value: 1)
$copy = $original.copy()
$copy.value = 2
$original.value`),
    { type: "Integer", value: 1 },
  );
});

test("methods may compare self with another value", () => {
  assert.deepEqual(
    evaluate(`struct Point {
  int x
  fn same(Point other) returns bool {
    self == other
  }
}
Point(x: 1).same(Point(x: 1))`),
    { type: "Boolean", value: true },
  );
});

test("method calls on temporary values are allowed", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn increment() returns int {
    self.value = self.value + 1
    self.value
  }
}
Counter(value: 41).increment()`),
    { type: "Integer", value: 42 },
  );
});

test("reading a method as a value is rejected", () => {
  assert.throws(
    () =>
      evaluate(`struct Counter {
  int value
  fn read() returns int {
    self.value
  }
}
Counter(value: 1).read`),
    /E_MEM_UNKNOWN.*may only be invoked directly/,
  );
});

test("reports calls to unknown struct methods", () => {
  assert.throws(
    () => evaluate("struct Empty {}\nEmpty().missing()"),
    /E_MEM_UNKNOWN.*has no method 'missing'/,
  );
});

test("direct reassignment of self is rejected", () => {
  assert.throws(
    () =>
      evaluate(`struct Counter {
  int value
  fn invalid() returns Counter {
    self = Counter(value: 2)
  }
}
Counter(value: 1).invalid()`),
    /E_SELF_ASSIGN/,
  );
});

test("a normal function called by a method does not inherit self", () => {
  assert.throws(
    () =>
      evaluate(`fn invalid() returns any {
  self
}
struct Value {
  int number
  fn call_invalid() returns any {
    invalid()
  }
}
Value(number: 1).call_invalid()`),
    /E_SELF_CONTEXT/,
  );
});

test("validates method parameter and return types", () => {
  assert.throws(
    () =>
      evaluate(`struct Value {
  int number
  fn set(int next) returns int {
    self.number = next
    self.number
  }
}
Value(number: 1).set("wrong")`),
    /expects int.*received string/i,
  );

  assert.throws(
    () =>
      evaluate(`struct Value {
  int number
  fn wrong() returns str {
    self.number
  }
}
Value(number: 1).wrong()`),
    /expects return type str.*returned integer/i,
  );
});
