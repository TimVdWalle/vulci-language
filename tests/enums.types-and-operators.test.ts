// Phase 15

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateEnumSource as evaluate } from "./enum-test-helpers.ts";

test("accepts exact enum parameter and return types", () => {
  assert.deepEqual(
    evaluate(`fn keep(Status value) returns Status {
  value
}
enum Status {
  Pending
}
keep(Status.Pending)`),
    { type: "Enum", enumName: "Status", memberName: "Pending" },
  );
});

test("rejects a different enum type for parameters and returns", () => {
  assert.throws(
    () =>
      evaluate(`fn keep(First value) returns First {
  value
}
enum First {
  Pending
}
enum Second {
  Pending
}
keep(Second.Pending)`),
    /expects First/,
  );
  assert.throws(
    () =>
      evaluate(`fn wrong() returns First {
  Second.Pending
}
enum First {
  Pending
}
enum Second {
  Pending
}
wrong()`),
    /expects return type First/,
  );
});

test("supports enum types in unions", () => {
  assert.deepEqual(
    evaluate(`fn keep(First|Second value) returns First|Second {
  value
}
enum First {
  Pending
}
enum Second {
  Pending
}
keep(Second.Pending)`),
    { type: "Enum", enumName: "Second", memberName: "Pending" },
  );
});

test("allows null only through an explicit union", () => {
  assert.deepEqual(
    evaluate(`fn keep(Status|null value) returns Status|null {
  value
}
enum Status {
  Pending
}
keep(null)`),
    { type: "Null" },
  );
  assert.throws(
    () =>
      evaluate(`fn keep(Status value) returns Status {
  value
}
enum Status {
  Pending
}
keep(null)`),
    /expects Status/,
  );
});

test("validates enum-typed parameter reassignment", () => {
  assert.deepEqual(
    evaluate(`fn advance(Status value) returns Status {
  value = Status.Running
  value
}
enum Status {
  Pending
  Running
}
advance(Status.Pending)`),
    { type: "Enum", enumName: "Status", memberName: "Running" },
  );
  assert.throws(
    () =>
      evaluate(`fn invalid(First value) returns First {
  value = Second.Pending
  value
}
enum First {
  Pending
}
enum Second {
  Pending
}
invalid(First.Pending)`),
    /Cannot assign Second.*expected First/,
  );
});

test("rejects ordering and arithmetic operators for enum values", () => {
  const declaration = `enum Status {
  Pending
  Running
}`;

  assert.throws(
    () => evaluate(`${declaration}\nStatus.Pending < Status.Running`),
    /requires two integers or two strings/,
  );
  assert.throws(
    () => evaluate(`${declaration}\nStatus.Pending + Status.Running`),
    /requires Integer operands/,
  );
  assert.throws(
    () => evaluate(`${declaration}\nStatus.Pending ~ "Pending"`),
    /requires string operands/,
  );
  assert.throws(
    () => evaluate(`${declaration}\n-(Status.Pending)`),
    /requires Integer operands/,
  );
});

test("rejects logical use and direct enum conditions", () => {
  const declaration = `enum Status {
  Pending
}`;

  assert.throws(
    () => evaluate(`${declaration}\nnot Status.Pending`),
    /requires a boolean operand/,
  );
  assert.throws(
    () => evaluate(`${declaration}\nStatus.Pending and true`),
    /requires boolean operands/,
  );
  assert.throws(
    () => evaluate(`${declaration}\nif (Status.Pending) {\n  1\n}`),
    /requires a Boolean condition/,
  );
});

test("compares an enum and a non-enum value as unequal", () => {
  assert.deepEqual(
    evaluate(`enum Status {
  Pending
}
Status.Pending == 1`),
    { type: "Boolean", value: false },
  );
});

test("treats different enum types as unequal", () => {
  assert.deepEqual(
    evaluate(`enum First {
  Pending
}
enum Second {
  Pending
}
First.Pending != Second.Pending`),
    { type: "Boolean", value: true },
  );
});

test("allows an enum named tuple without replacing tuple type syntax", () => {
  assert.deepEqual(
    evaluate(`fn first(tuple(tuple, int) value) returns tuple {
  value[0]
}
fn keep(tuple value) returns tuple {
  value
}
enum tuple {
  Pending
}
keep(first((tuple.Pending, 14)))`),
    { type: "Enum", enumName: "tuple", memberName: "Pending" },
  );
});
