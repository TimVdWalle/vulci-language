// Phase 14

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { findEnumBindingConflict } from "../src/evaluator/enum-validation.js";
import {
  evaluateEnumSource as evaluate,
  evaluateEnumSourceWithBuiltins as evaluateWithBuiltins,
  parseEnumSource as parse,
} from "./enum-test-helpers.ts";

test("reports duplicate and built-in enum names with E_ENUM_DUP", () => {
  assert.throws(
    () =>
      evaluate(`enum Status {
  Pending
}
enum Status {
  Running
}`),
    /E_ENUM_DUP/,
  );
  assert.throws(() => parse("enum int {\n  Value\n}"), /E_ENUM_DUP/);
  assert.throws(() => parse("enum null {\n  Value\n}"), /E_ENUM_DUP/);
});

test("reports enum collisions with functions, structs, and existing values", () => {
  assert.throws(
    () =>
      evaluate(`fn Status() returns null {
  null
}
enum Status {
  Pending
}`),
    /E_ENUM_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`struct Status {
}
enum Status {
  Pending
}`),
    /E_ENUM_DUP/,
  );

  const environment = new Environment();
  environment.define("Status", { type: "Integer", value: 1 });
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}", environment),
    /E_ENUM_DUP/,
  );

  const evaluator = new Evaluator(new Environment());
  evaluator.evaluate(parse("enum Existing {\n  Value\n}"));
  assert.throws(
    () => evaluator.evaluate(parse("fn Existing() returns null { null }")),
    /already defined as an enum/,
  );
});

test("reports enum collisions with built-in functions", () => {
  assert.throws(
    () =>
      evaluateWithBuiltins(`enum print {
  Value
}`),
    /E_ENUM_DUP/,
  );
});

test("reports an enum collision with the implicit self binding", () => {
  assert.throws(() => evaluate("enum self {\n  Value\n}"), /E_ENUM_DUP/);
});

test("reports enum-name rebinding as variables or parameters", () => {
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus = 1"),
    /E_ENUM_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`Status = 1
enum Status {
  Pending
}`),
    /E_ENUM_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`enum Status {
  Pending
}
fn invalid(any Status) returns any {
  Status
}`),
    /E_ENUM_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`enum Status {
  Pending
}
fn invalid() returns int {
  Status = 1
  Status
}`),
    /E_ENUM_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`enum Status { Pending }
fn invalid() returns int {
  if (true) { Status = 1 }
  1
}`),
    /E_ENUM_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`enum Status { Pending }
struct Box {
  fn invalid() returns int { Status = 1 }
}`),
    /E_ENUM_DUP/,
  );

  const defaultProgram = parse(
    "fn invalid(any value = 1) returns any { value }",
  );
  const defaultDeclaration = defaultProgram.statements[0];
  assert.equal(defaultDeclaration?.type, "ExpressionStatement");
  assert.equal(defaultDeclaration.expression.type, "FunctionDeclaration");
  if (defaultDeclaration.expression.type !== "FunctionDeclaration") {
    assert.fail();
  }
  defaultDeclaration.expression.parameterDefaults[0] = {
    type: "AssignmentExpression",
    name: "Status",
    value: { type: "IntegerLiteral", value: 1 },
  };
  assert.equal(
    findEnumBindingConflict(defaultProgram, new Set(["Status"]))?.name,
    "Status",
  );
});

test("keeps dollar-prefixed globals distinct from enum names", () => {
  assert.deepEqual(
    evaluate(`enum Status {
  Pending
}
$Status = 14
Status.Pending`),
    { type: "Enum", enumName: "Status", memberName: "Pending" },
  );
});

test("reports duplicate members with E_ENUM_MEMBER_DUP", () => {
  assert.throws(
    () => parse("enum Status {\n  Pending\n  Pending\n}"),
    /E_ENUM_MEMBER_DUP/,
  );

  const program = parse("enum Status { Pending }");
  const statement = program.statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "EnumDeclaration");
  if (statement.expression.type !== "EnumDeclaration") assert.fail();
  statement.expression.members.push(statement.expression.members[0]!);
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(program),
    /E_ENUM_MEMBER_DUP/,
  );
});

test("reports unknown enum members with E_MEM_UNKNOWN", () => {
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Missing"),
    /E_MEM_UNKNOWN.*Status.*Missing/,
  );
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Missing()"),
    /E_MEM_UNKNOWN.*Status.*Missing/,
  );
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Missing = 1"),
    /E_MEM_UNKNOWN.*Status.*Missing/,
  );
});

test("rejects bare member references and bare enum qualifiers", () => {
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nPending"),
    /Undefined variable 'Pending'/,
  );
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus"),
    /must be accessed through a qualified member/,
  );
});

test("keeps enum member names out of the surrounding namespace", () => {
  assert.deepEqual(
    evaluate(`enum Status {
  Pending
}
fn read() returns int {
  Pending = 42
  Pending
}
read()`),
    { type: "Integer", value: 42 },
  );
});

test("does not introduce enum constructors", () => {
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus()"),
    /Enum 'Status' is not callable/,
  );
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Pending()"),
    /E_MEM_TYPE.*cannot be called/,
  );
});

test("does not provide enum instance fields, methods, or mutable members", () => {
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Pending.name"),
    /E_MEM_TYPE/,
  );
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Pending.name()"),
    /E_MEM_TYPE/,
  );
  assert.throws(
    () => evaluate("enum Status {\n  Pending\n}\nStatus.Pending = 1"),
    /E_MEM_TYPE.*not mutable/,
  );
});
