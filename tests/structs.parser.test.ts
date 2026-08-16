// Phase 13

import assert from "node:assert/strict";
import test from "node:test";
import { parseStructSource as parse } from "./struct-test-helpers.ts";

test("parses fields, defaults, methods, and named construction", () => {
  const program = parse(`struct User {
  str name
  int age = 18
  fn display_name() returns str {
    self.name
  }
}
user = User(age: 30, name: "Tim",)`);
  const declaration = program.statements[0]!.expression;

  assert.equal(declaration.type, "StructDeclaration");
  if (declaration.type !== "StructDeclaration") return;
  assert.equal(declaration.name.lexeme, "User");
  assert.deepEqual(
    declaration.fields.map((field) => field.name.lexeme),
    ["name", "age"],
  );
  assert.equal(declaration.fields[0]?.defaultValue, null);
  assert.equal(declaration.fields[1]?.defaultValue?.type, "IntegerLiteral");
  assert.equal(declaration.methods[0]?.name.lexeme, "display_name");

  const assignment = program.statements[1]!.expression;
  assert.equal(assignment.type, "AssignmentExpression");
  if (assignment.type !== "AssignmentExpression") return;
  assert.equal(assignment.value.type, "StructConstruction");
  if (assignment.value.type !== "StructConstruction") return;
  assert.deepEqual(
    assignment.value.fields.map((field) => field.name.lexeme),
    ["age", "name"],
  );
});

test("parses empty structs and forward struct references", () => {
  const program = parse(`struct Wrapper {
  Empty value
}
struct Empty {
}
Wrapper(value: Empty())`);
  const wrapper = program.statements[0]!.expression;
  const construction = program.statements[2]!.expression;

  assert.equal(wrapper.type, "StructDeclaration");
  if (wrapper.type !== "StructDeclaration") return;
  assert.equal(wrapper.fields[0]?.fieldType.members[0]?.lexeme, "Empty");
  assert.equal(construction.type, "StructConstruction");
  assert.doesNotThrow(() => parse("struct Compact { int value }"));
});

test("accepts struct types in unions, tuples, parameters, and returns", () => {
  const program = parse(`struct User {
  str name
}
struct Holder {
  tuple(User|null, int) item
}
fn identity(User|null value) returns tuple(User, int) {
  (User(name: "Tim"), 1)
}`);
  const holder = program.statements[1]!.expression;
  const identity = program.statements[2]!.expression;

  assert.equal(holder.type, "StructDeclaration");
  assert.equal(identity.type, "FunctionDeclaration");
});

test("parses struct member calls and mutable member targets", () => {
  const program = parse(`counter.increment(by: 2)
user.address.city = "Rome"`);
  const call = program.statements[0]!.expression;
  const assignment = program.statements[1]!.expression;

  assert.equal(call.type, "MemberCall");
  if (call.type === "MemberCall") {
    assert.equal(call.member.lexeme, "increment");
    assert.equal(call.argumentNames[0]?.lexeme, "by");
  }

  assert.equal(assignment.type, "AssignmentExpression");
  assert.ok(
    assignment.type === "AssignmentExpression" && "target" in assignment,
  );
});

test("rejects struct declarations outside the top level", () => {
  assert.throws(
    () =>
      parse(`fn invalid() returns null {
  struct User {
  }
}`),
    /Expected expression.*2:3/,
  );
});

test("rejects duplicate field and method member names", () => {
  assert.throws(
    () =>
      parse(`struct Point {
  int x
  int x
}`),
    /E_STRUCT_MEMBER_DUP.*'x'/,
  );

  assert.throws(
    () =>
      parse(`struct Point {
  fn x() returns int {
    1
  }
  fn x() returns int {
    2
  }
}`),
    /E_STRUCT_MEMBER_DUP.*'x'/,
  );

  assert.throws(
    () =>
      parse(`struct Point {
  int x
  fn x() returns int {
    1
  }
}`),
    /E_STRUCT_MEMBER_DUP.*'x'/,
  );
});

test("rejects positional and duplicate construction fields", () => {
  assert.throws(
    () => parse("struct Value {}\nValue(, field: 1)"),
    /Expected struct field before ','/,
  );
  assert.throws(
    () =>
      parse(`struct User {
  str name
}
User("Tim")`),
    /requires named fields/,
  );
  assert.throws(
    () =>
      parse(`struct User {
  str name
}
User(name: "A", name: "B")`),
    /E_STRUCT_FIELD_DUP.*'name'/,
  );
});

test("rejects malformed struct declarations", () => {
  assert.throws(() => parse("struct {}"), /Expected struct name/);
  assert.throws(() => parse("struct User"), /Expected '\{'/);
  assert.throws(
    () => parse("struct User { |int value }"),
    /A union type cannot start with '\|'/,
  );
  assert.throws(() => parse("struct User {\n  int\n}"), /Expected field name/);
  assert.throws(
    () => parse("struct User {\n  int x int y\n}"),
    /Expected a newline after struct member/,
  );
  assert.throws(
    () => parse("struct User {\n  Missing value\n}"),
    /Unknown type name 'Missing'/,
  );
});

test("rejects assignments anywhere inside field defaults", () => {
  assert.throws(
    () => parse("struct Value {\n  int value = (other = 1)\n}"),
    /Assignments are not allowed in struct field defaults/,
  );
  assert.throws(
    () =>
      parse(`struct Value {
  int value = if (true) {
    other = 1
  } else {
    2
  }
}`),
    /Assignments are not allowed in struct field defaults/,
  );
});

test("rejects an explicit self parameter on a struct method", () => {
  assert.throws(
    () =>
      parse(`struct Value {
  fn read(any self) returns any {
    self
  }
}`),
    /cannot declare a parameter named 'self'/,
  );
});
