// Phase 15

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";
import { TokenType } from "../src/token.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

function evaluate(source: string): RuntimeValue {
  return new Evaluator(new Environment()).evaluate(parse(source));
}

test("lexes is as a reserved keyword", () => {
  assert.deepEqual(
    new Lexer("value is int").lex().map((token) => token.type),
    [TokenType.Identifier, TokenType.Is, TokenType.Identifier, TokenType.EOF],
  );

  assert.throws(() => parse("fn is() returns null {\n  null\n}"));
});

test("parses a type inspection expression", () => {
  const statement = parse("1 is int").statements[0];

  assert.equal(statement?.type, "ExpressionStatement");

  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }

  assert.equal(statement.expression.type, "TypeInspectionExpression");

  if (statement.expression.type !== "TypeInspectionExpression") {
    assert.fail("Expected a type inspection expression.");
  }

  assert.equal(statement.expression.operator.type, TokenType.Is);
  assert.deepEqual(
    statement.expression.inspectedType.members.map((member) => member.lexeme),
    ["int"],
  );
});

test("matches scalar, any, null, and union types", () => {
  const cases: Array<[string, boolean]> = [
    ["1 is int", true],
    ["1 is bool", false],
    ['"value" is str', true],
    ["false is bool", true],
    ["null is null", true],
    ["1 is null", false],
    ["null is any", true],
    ["true is int|bool", true],
    ['"value" is int|bool', false],
  ];

  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source), {
      type: "Boolean",
      value: expected,
    });
  }
});

test("matches structural tuple types recursively", () => {
  assert.deepEqual(
    evaluate("((1, true), null) is tuple(tuple(int, bool), null)"),
    {
      type: "Boolean",
      value: true,
    },
  );
  assert.deepEqual(evaluate("(1, true) is tuple(int, int)"), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("(1, true, 3) is tuple(int, bool)"), {
    type: "Boolean",
    value: false,
  });
});

test("matches declared struct and enum types nominally", () => {
  assert.deepEqual(
    evaluate(`struct Point {
  int x
}
enum Status {
  Ready
}
(Point(x: 1) is Point, Status.Ready is Status)`),
    {
      type: "Tuple",
      members: [
        { type: "Boolean", value: true },
        { type: "Boolean", value: true },
      ],
    },
  );
});

test("evaluates the inspected value once", () => {
  assert.deepEqual(
    evaluate(`$value = 0
$matches = ($value = $value + 1) is int
($matches, $value)`),
    {
      type: "Tuple",
      members: [
        { type: "Boolean", value: true },
        { type: "Integer", value: 1 },
      ],
    },
  );
});

test("uses comparison precedence and ordinary logical negation", () => {
  assert.deepEqual(evaluate("1 + 2 is int and not (false is int)"), {
    type: "Boolean",
    value: true,
  });
});

test("supports type inspection inside string interpolation", () => {
  assert.deepEqual(evaluate('"matches={{1 is int}}"'), {
    type: "String",
    value: "matches=true",
  });
});

test("excludes is from unparenthesized comparison chains", () => {
  assert.throws(
    () => parse("1 is int == true"),
    /cannot be combined with another comparison operator/,
  );
  assert.throws(
    () => parse("1 == 1 is int"),
    /cannot be combined with another comparison operator/,
  );
  assert.throws(
    () => parse("1 is int is bool"),
    /cannot be combined with another comparison operator/,
  );

  assert.deepEqual(evaluate("(1 is int) == true"), {
    type: "Boolean",
    value: true,
  });
});

test("rejects is not and unknown types", () => {
  assert.throws(() => parse("1 is not int"), /Expected a type after 'is'/);
  assert.throws(() => parse("1 is Missing"), /Unknown type name 'Missing'/);
});
