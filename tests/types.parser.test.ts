// Phase 8

import assert from "node:assert/strict";
import test from "node:test";
import { FunctionDeclaration } from "../src/ast.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

function parseWithoutWarnings(source: string) {
  const originalWarn = console.warn;

  console.warn = () => undefined;

  try {
    return parse(source);
  } finally {
    console.warn = originalWarn;
  }
}

function getFunction(source: string): FunctionDeclaration {
  const program = parseWithoutWarnings(source);
  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "FunctionDeclaration");

  if (statement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  return statement.expression;
}

function captureWarnings(source: string): string[] {
  const warnings: string[] = [];
  const originalWarn = console.warn;

  console.warn = (...values: unknown[]) => {
    warnings.push(values.map(String).join(" "));
  };

  try {
    parse(source);
  } finally {
    console.warn = originalWarn;
  }

  return warnings;
}

test("parses a typed parameter and return type", () => {
  const declaration = getFunction(`fn double(int value) returns int {
  value * 2
}`);

  assert.deepEqual(
    declaration.parameterTypes?.[0]?.members.map((member) => member.lexeme),
    ["int"],
  );

  assert.deepEqual(
    declaration.returnType?.members.map((member) => member.lexeme),
    ["int"],
  );
});

test("parses multiple typed parameters", () => {
  const declaration = getFunction(
    `fn choose(bool condition, int left, int right) returns int {
  if (condition) {
    return left
  }

  right
}`,
  );

  assert.deepEqual(
    declaration.parameterTypes?.map((type) =>
      type?.members.map((member) => member.lexeme),
    ),
    [["bool"], ["int"], ["int"]],
  );
});

test("parses a parameter union", () => {
  const declaration = getFunction(
    `fn preserve(int|bool value) returns int|bool {
  value
}`,
  );

  assert.deepEqual(
    declaration.parameterTypes?.[0]?.members.map((member) => member.lexeme),
    ["int", "bool"],
  );
});

test("parses a return union", () => {
  const declaration = getFunction(
    `fn preserve(int value) returns int|bool {
  value
}`,
  );

  assert.deepEqual(
    declaration.returnType?.members.map((member) => member.lexeme),
    ["int", "bool"],
  );
});

test("parses null in a union type", () => {
  const declaration = getFunction(
    `fn positiveOrNull(int value) returns int|null {
  if (value > 0) {
    return value
  }

  null
}`,
  );

  assert.deepEqual(
    declaration.returnType?.members.map((member) => member.lexeme),
    ["int", "null"],
  );
});

test("parses null as a single return type", () => {
  const declaration = getFunction(`fn stop() returns null {
  return
}`);

  assert.deepEqual(
    declaration.returnType?.members.map((member) => member.lexeme),
    ["null"],
  );
});

test("parses explicit any annotations", () => {
  const declaration = getFunction(`fn identity(any value) returns any {
  value
}`);

  assert.deepEqual(
    declaration.parameterTypes?.[0]?.members.map((member) => member.lexeme),
    ["any"],
  );

  assert.deepEqual(
    declaration.returnType?.members.map((member) => member.lexeme),
    ["any"],
  );
});

test("records omitted types in a mixed parameter declaration", () => {
  const declaration = getFunction(
    `fn combine(int left, right) returns int {
  left + right
}`,
  );

  assert.deepEqual(
    declaration.parameterTypes?.map((type) =>
      type === null ? null : type.members.map((member) => member.lexeme),
    ),
    [["int"], null],
  );
});

test("preserves the previous AST shape for fully untyped functions", () => {
  const declaration = getFunction(`fn add(left, right) {
  left + right
}`);

  assert.equal("parameterTypes" in declaration, false);
  assert.equal("returnType" in declaration, false);
});

test("rejects an unknown parameter type", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(number value) returns int {
  value
}`),
    /Unknown type name 'number'\./,
  );
});

test("rejects an unknown return type", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int value) returns number {
  value
}`),
    /Unknown type name 'number'\./,
  );
});

test("rejects a union starting with a separator", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(|int value) returns int {
  value
}`),
    /A union type cannot start with '\|'\./,
  );
  assert.throws(
    () => parseWithoutWarnings("fn use() returns |int { 1 }"),
    /A union type cannot start with '\|'\./,
  );
});

test("rejects a trailing parameter union separator", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int|) returns int {
  1
}`),
    /Expected a type name after '\|'\./,
  );
});

test("rejects a trailing return union separator", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int value) returns int| {
  value
}`),
    /Expected a type name after '\|'\./,
  );
});

test("rejects repeated union separators", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int||bool value) returns int {
  value
}`),
    /A union type cannot contain repeated '\|'\./,
  );
});

test("rejects duplicate union members", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int|int value) returns int {
  value
}`),
    /Duplicate union member 'int'\./,
  );
});

test("rejects any as the first union member", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(any|int value) returns int {
  1
}`),
    /'any' cannot appear inside a union type\./,
  );
});

test("rejects any as a later union member", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int|any value) returns int {
  value
}`),
    /'any' cannot appear inside a union type\./,
  );
});

test("rejects a missing parameter name after a type", () => {
  assert.throws(
    () =>
      parseWithoutWarnings(`fn use(int) returns int {
  1
}`),
    /Expected parameter name after type declaration\./,
  );
});

test("does not warn for an explicit any parameter", () => {
  const warnings = captureWarnings(`fn identity(any value) returns int {
  1
}`);

  assert.equal(warnings.length, 0);
});

test("does not warn for an explicit any return type", () => {
  const warnings = captureWarnings(`fn identity(int value) returns any {
  value
}`);

  assert.equal(warnings.length, 0);
});

test("warns separately for every omitted annotation", () => {
  const warnings = captureWarnings(`fn combine(left, right) {
  left + right
}`);

  assert.equal(warnings.length, 3);

  assert.match(warnings[0]!, /^warning:/);
  assert.match(warnings[0]!, /parameter 'left'/);
  assert.match(warnings[0]!, /1:12/);

  assert.match(warnings[1]!, /^warning:/);
  assert.match(warnings[1]!, /parameter 'right'/);
  assert.match(warnings[1]!, /1:18/);

  assert.match(warnings[2]!, /^warning:/);
  assert.match(warnings[2]!, /function 'combine'/);
  assert.match(warnings[2]!, /1:4/);
});

test("does not warn for spaced union separators", () => {
  const warnings = captureWarnings(
    `fn convert(int | bool value) returns int | null {

  1

}`,
  );

  assert.equal(warnings.length, 0);
});

test("does not warn for compact unions", () => {
  const warnings = captureWarnings(
    `fn convert(int|bool value) returns int|null {
  1
}`,
  );

  assert.deepEqual(warnings, []);
});
