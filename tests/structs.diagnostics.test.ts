// Phase 13

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import {
  findStructBindingConflict,
  validateStructRecursion,
} from "../src/evaluator/struct-validation.js";
import {
  parseStructSource as parse,
  evaluateStructSource as evaluate,
} from "./struct-test-helpers.ts";

test("reports duplicate and built-in struct names with E_STRUCT_DUP", () => {
  assert.throws(
    () => evaluate("struct User {}\nstruct User {}"),
    /E_STRUCT_DUP/,
  );
  assert.throws(() => evaluate("struct int {}"), /E_STRUCT_DUP/);
});

test("reports struct collisions with functions and existing values", () => {
  assert.throws(
    () =>
      evaluate(`fn User() returns null {
  null
}
struct User {}`),
    /E_STRUCT_DUP/,
  );

  const environment = new Environment();
  environment.define("User", {
    type: "NativeFunction",
    parameters: [],
    call() {
      return { type: "Null" };
    },
  });
  assert.throws(() => evaluate("struct User {}", environment), /E_STRUCT_DUP/);
});

test("reports struct-name rebinding as variables or parameters", () => {
  assert.throws(() => evaluate("struct User {}\nUser = 1"), /E_STRUCT_DUP/);
  assert.throws(
    () =>
      evaluate(`struct User {}
fn invalid() returns int {
  User = 1
  User
}`),
    /E_STRUCT_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`struct User {}
fn invalid(any User) returns any {
  User
}`),
    /E_STRUCT_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`struct User {}
fn invalid() returns int {
  if (true) { User = 1 }
  1
}`),
    /E_STRUCT_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`struct User {}
struct Box {
  fn invalid() returns int { User = 1 }
}`),
    /E_STRUCT_DUP/,
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
    name: "User",
    value: { type: "IntegerLiteral", value: 1 },
  };
  assert.equal(
    findStructBindingConflict(defaultProgram, new Set(["User"]))?.name,
    "User",
  );
});

test("keeps dollar-prefixed globals distinct from struct names", () => {
  assert.deepEqual(evaluate("struct User {}\n$User = 1\nUser()"), {
    type: "Struct",
    name: "User",
    fields: [],
  });
});

test("reports duplicate members with E_STRUCT_MEMBER_DUP", () => {
  assert.throws(
    () => parse("struct Value {\n  int number\n  int number\n}"),
    /E_STRUCT_MEMBER_DUP/,
  );

  const program = parse("struct Value { int number }");
  const statement = program.statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "StructDeclaration");
  if (statement.expression.type !== "StructDeclaration") assert.fail();
  statement.expression.fields.push(statement.expression.fields[0]!);
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(program),
    /E_STRUCT_MEMBER_DUP/,
  );
});

test("reports construction shape diagnostics", () => {
  assert.throws(
    () => evaluate("Value(1)\nstruct Value { int number }"),
    /requires named fields/,
  );
  assert.throws(
    () =>
      evaluate(`struct Value {
  int number
}
Value()`),
    /E_STRUCT_FIELD_MISSING/,
  );
  assert.throws(
    () =>
      evaluate(`struct Value {
  int number = 1
}
Value(extra: 2)`),
    /E_STRUCT_FIELD_UNKNOWN/,
  );
  assert.throws(
    () =>
      parse(`struct Value {
  int number
}
Value(number: 1, number: 2)`),
    /E_STRUCT_FIELD_DUP/,
  );

  const duplicateProgram = parse(
    "struct Value { int number }\nValue(number: 1)",
  );
  const duplicateStatement = duplicateProgram.statements[1];
  assert.equal(duplicateStatement?.type, "ExpressionStatement");
  assert.equal(duplicateStatement.expression.type, "StructConstruction");
  if (duplicateStatement.expression.type !== "StructConstruction") {
    assert.fail();
  }
  duplicateStatement.expression.fields.push(
    duplicateStatement.expression.fields[0]!,
  );
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(duplicateProgram),
    /E_STRUCT_FIELD_DUP/,
  );

  const unknownProgram = parse("struct Value {}\nValue()");
  const unknownStatement = unknownProgram.statements[1];
  assert.equal(unknownStatement?.type, "ExpressionStatement");
  assert.equal(unknownStatement.expression.type, "StructConstruction");
  if (unknownStatement.expression.type !== "StructConstruction") assert.fail();
  unknownStatement.expression.constructor.lexeme = "Missing";
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(unknownProgram),
    /Undefined struct constructor 'Missing'/,
  );
});

test("reports field type and recursion diagnostics", () => {
  assert.throws(
    () =>
      evaluate(`struct Value {
  int number
}
Value(number: false)`),
    /E_STRUCT_FIELD_TYPE/,
  );
  assert.throws(
    () => evaluate("struct Value {\n  Value nested\n}"),
    /E_STRUCT_RECURSION/,
  );
  assert.doesNotThrow(() =>
    evaluate("struct Parent { Child child }\nstruct Child { int value }"),
  );
  assert.doesNotThrow(() =>
    evaluate("struct Child { int value }\nstruct Parent { Child child }"),
  );
  const collectionProgram = parse("struct Node { int value }");
  const collectionStatement = collectionProgram.statements[0];
  assert.equal(collectionStatement?.type, "ExpressionStatement");
  assert.equal(collectionStatement.expression.type, "StructDeclaration");
  if (collectionStatement.expression.type !== "StructDeclaration") {
    assert.fail();
  }
  const collectionField = collectionStatement.expression.fields[0]!;
  collectionField.fieldType.members = [
    {
      type: "CollectionType",
      lexeme: "list",
      token: collectionField.name,
      arguments: [
        {
          members: [
            {
              type: "NamedType",
              lexeme: "Node",
              token: collectionField.name,
            },
          ],
        },
      ],
    },
  ];
  assert.doesNotThrow(() =>
    validateStructRecursion(
      new Map([["Node", collectionStatement.expression]]),
    ),
  );
});

test("reports self context and assignment diagnostics", () => {
  assert.throws(() => evaluate("self"), /E_SELF_CONTEXT/);
  assert.throws(
    () =>
      evaluate(`struct Value {
  int number
  fn invalid() returns Value {
    self = Value(number: 2)
  }
}
Value(number: 1).invalid()`),
    /E_SELF_ASSIGN/,
  );
});

test("reports general struct member diagnostics", () => {
  assert.throws(
    () =>
      evaluate(`struct Value {
  int number
}
Value(number: 1).missing`),
    /E_MEM_UNKNOWN/,
  );
  assert.throws(() => evaluate("true.missing"), /E_MEM_TYPE/);
});
