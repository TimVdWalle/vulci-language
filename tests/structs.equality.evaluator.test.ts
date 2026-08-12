// Phase 15

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateStructSource as evaluate } from "./struct-test-helpers.ts";

test("compares equal structs structurally", () => {
  assert.deepEqual(
    evaluate(`struct Point {
  int x
  int y
}
Point(x: 1, y: 2) == Point(x: 1, y: 2)`),
    { type: "Boolean", value: true },
  );
});

test("detects unequal struct fields", () => {
  assert.deepEqual(
    evaluate(`struct Point {
  int x
}
Point(x: 1) != Point(x: 2)`),
    { type: "Boolean", value: true },
  );
});

test("different declared struct types are unequal", () => {
  assert.deepEqual(
    evaluate(`struct Left {
  int value
}
struct Right {
  int value
}
Left(value: 1) == Right(value: 1)`),
    { type: "Boolean", value: false },
  );
});

test("compares nested structs recursively", () => {
  assert.deepEqual(
    evaluate(`struct Inner {
  int value
}
struct Outer {
  Inner inner
}
Outer(inner: Inner(value: 1)) == Outer(inner: Inner(value: 1))`),
    { type: "Boolean", value: true },
  );
});

test("empty structs of the same declared type are equal", () => {
  assert.deepEqual(
    evaluate(`struct Empty {}
Empty() == Empty()`),
    { type: "Boolean", value: true },
  );
});

test("methods are ignored by struct equality", () => {
  assert.deepEqual(
    evaluate(`struct Value {
  int number
  fn read() returns int {
    self.number
  }
}
Value(number: 1) == Value(number: 1)`),
    { type: "Boolean", value: true },
  );
});

test("supports structs in equality chains", () => {
  assert.deepEqual(
    evaluate(`struct Value {
  int number
}
Value(number: 1) == Value(number: 1) == Value(number: 1)`),
    { type: "Boolean", value: true },
  );
});

test("compares structs and other runtime types as unequal", () => {
  assert.deepEqual(
    evaluate(`struct Value {
  int number
}
Value(number: 1) == 1`),
    { type: "Boolean", value: false },
  );
});

test("uses normal field equality rules recursively", () => {
  assert.deepEqual(
    evaluate(`struct Pair {
  tuple(int, int) values
}
Pair(values: (1, 2)) == Pair(values: (1, 2))`),
    { type: "Boolean", value: true },
  );
});
