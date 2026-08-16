// Phase 9

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { TokenType } from "../src/token.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

test("parses named arguments", () => {
  const program = parse("calculate(left: 10, right: 20)");

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "FunctionCall",
      callee: "calculate",
      calleeToken: {
        type: TokenType.Identifier,
        lexeme: "calculate",
        line: 1,
        column: 1,
      },
      arguments: [
        {
          type: "IntegerLiteral",
          value: 10,
        },
        {
          type: "IntegerLiteral",
          value: 20,
        },
      ],
      argumentNames: [
        {
          type: TokenType.Identifier,
          lexeme: "left",
          line: 1,
          column: 11,
        },
        {
          type: TokenType.Identifier,
          lexeme: "right",
          line: 1,
          column: 21,
        },
      ],
    },
  });
});

test("parses reordered named arguments", () => {
  const program = parse("calculate(right: 20, left: 10)");

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionCall");

  if (statement?.expression.type !== "FunctionCall") {
    assert.fail("Expected a function call.");
  }

  assert.deepEqual(
    statement.expression.argumentNames.map((name) => name?.lexeme ?? null),
    ["right", "left"],
  );
});

test("parses positional arguments followed by named arguments", () => {
  const program = parse("calculate(10, right: 20)");

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionCall");

  if (statement?.expression.type !== "FunctionCall") {
    assert.fail("Expected a function call.");
  }

  assert.deepEqual(
    statement.expression.argumentNames.map((name) => name?.lexeme ?? null),
    [null, "right"],
  );
});

test("parses parameter defaults", () => {
  const program = parse(`fn calculate(left, right=10) {
  left + right
}`);

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionDeclaration");

  if (statement?.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(statement.expression.parameterDefaults, [
    null,
    {
      type: "IntegerLiteral",
      value: 10,
    },
  ]);
});

test("parses multiple parameter defaults", () => {
  const program = parse(`fn calculate(
  value,
  multiplier=2,
  offset=1,
) {
  value * multiplier + offset
}`);

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionDeclaration");

  if (statement?.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(statement.expression.parameterDefaults, [
    null,
    {
      type: "IntegerLiteral",
      value: 2,
    },
    {
      type: "IntegerLiteral",
      value: 1,
    },
  ]);
});

test("parses expression defaults", () => {
  const program = parse(`fn calculate(value=20 + 22) {
  value
}`);

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionDeclaration");

  if (statement?.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.equal(
    statement.expression.parameterDefaults[0]?.type,
    "BinaryExpression",
  );
});

test("parses function calls as defaults", () => {
  const program = parse(`fn calculate(value=fallback()) {
  value
}`);

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionDeclaration");

  if (statement?.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(statement.expression.parameterDefaults[0], {
    type: "FunctionCall",
    callee: "fallback",
    calleeToken: {
      type: TokenType.Identifier,
      lexeme: "fallback",
      line: 1,
      column: 20,
    },
    arguments: [],
    argumentNames: [],
  });
});

test("parses trailing commas in parameter lists", () => {
  const program = parse(`fn add(
  left,
  right,
) {
  left + right
}`);

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionDeclaration");

  if (statement?.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.equal(statement.expression.parameters.length, 2);
});

test("parses trailing commas in argument lists", () => {
  const program = parse(`calculate(
  10,
  right: 20,
)`);

  const statement = program.statements[0];

  assert.equal(statement?.expression.type, "FunctionCall");

  if (statement?.expression.type !== "FunctionCall") {
    assert.fail("Expected a function call.");
  }

  assert.equal(statement.expression.arguments.length, 2);
});

test("rejects positional arguments after named arguments", () => {
  assert.throws(() => parse("calculate(,)"), /Expected argument before ','/);
  assert.throws(
    () => parse("calculate(left: 10, 20)"),
    /Positional arguments cannot follow named arguments\./,
  );
});

test("rejects duplicate named arguments", () => {
  assert.throws(
    () => parse("calculate(value: 10, value: 20)"),
    /Duplicate argument 'value'\./,
  );
});

test("rejects required parameters after optional parameters", () => {
  assert.throws(
    () =>
      parse(`fn calculate(left=10, right) {
  left + right
}`),
    /Required parameters must appear before optional parameters\./,
  );
});

test("rejects assignments in parameter defaults", () => {
  assert.throws(
    () =>
      parse(`fn calculate(value=other=10) {
  value
}`),
    /Assignments are not allowed in default parameter values\./,
  );
});

test("rejects nested assignments in parameter defaults", () => {
  assert.throws(
    () =>
      parse(`fn calculate(value=1 + (other=10)) {
  value
}`),
    /Assignments are not allowed in default parameter values\./,
  );
});
