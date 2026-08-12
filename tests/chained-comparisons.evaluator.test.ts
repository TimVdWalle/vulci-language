// Phase 15

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";

function evaluate(source: string): RuntimeValue {
  const tokens = new Lexer(source).lex();
  const program = new Parser(tokens).parse();
  const environment = new Environment();

  return new Evaluator(environment).evaluate(program);
}

test("evaluates a true ordering comparison chain", () => {
  assert.deepEqual(evaluate("1 < 2 <= 3"), {
    type: "Boolean",
    value: true,
  });
});

test("evaluates a false ordering comparison chain", () => {
  assert.deepEqual(evaluate("1 < 2 > 3"), {
    type: "Boolean",
    value: false,
  });
});

test("evaluates all ordering operators in chains", () => {
  const cases: Array<[string, boolean]> = [
    ["1 < 2 < 3", true],
    ["1 <= 1 <= 2", true],
    ["3 > 2 > 1", true],
    ["3 >= 3 >= 2", true],
    ["1 < 2 >= 2", true],
    ["3 > 2 <= 2", true],
  ];

  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source), {
      type: "Boolean",
      value: expected,
    });
  }
});

test("evaluates a true equality comparison chain", () => {
  assert.deepEqual(evaluate("1 == 1 != 2"), {
    type: "Boolean",
    value: true,
  });
});

test("evaluates a false equality comparison chain", () => {
  assert.deepEqual(evaluate("1 == 1 == 2"), {
    type: "Boolean",
    value: false,
  });
});

test("supports Boolean equality chains", () => {
  assert.deepEqual(evaluate("true == true != false"), {
    type: "Boolean",
    value: true,
  });
});

test("supports null equality chains", () => {
  assert.deepEqual(evaluate("null == null == null"), {
    type: "Boolean",
    value: true,
  });
});

test("evaluates arithmetic operands before comparisons", () => {
  assert.deepEqual(evaluate("1 + 1 < 2 * 2 <= 8 / 2"), {
    type: "Boolean",
    value: true,
  });
});

test("evaluates each middle operand only once", () => {
  const source = `$value = 0
$result = 0 < ($value = $value + 1) < 2
$value
`;

  assert.deepEqual(evaluate(source), {
    type: "Integer",
    value: 1,
  });
});

test("evaluates chained operands from left to right", () => {
  const source = `$value = 0
$result = ($value = $value + 1) < ($value = $value + 1) < ($value = $value + 1)
$value
`;

  assert.deepEqual(evaluate(source), {
    type: "Integer",
    value: 3,
  });
});

test("stops evaluating after the first false comparison", () => {
  const source = `$value = 0
$result = 10 < 5 < ($value = 1)
$value
`;

  assert.deepEqual(evaluate(source), {
    type: "Integer",
    value: 0,
  });
});

test("does not evaluate an invalid skipped operand", () => {
  assert.deepEqual(evaluate("10 < 5 < 1 / 0"), {
    type: "Boolean",
    value: false,
  });
});

test("rejects a Boolean operand in an ordering chain", () => {
  assert.throws(
    () => evaluate("1 < true < 3"),
    /Invalid operand type in chained comparison: operator '<' requires two integers or two strings\. at 1:3/,
  );
});

test("rejects a null operand in an ordering chain", () => {
  assert.throws(
    () => evaluate("1 < null < 3"),
    /Invalid operand type in chained comparison: operator '<' requires two integers or two strings\. at 1:3/,
  );
});

test("reports a later invalid ordering operator position", () => {
  assert.throws(
    () => evaluate("1 < 2 < false"),
    /Invalid operand type in chained comparison: operator '<' requires two integers or two strings\. at 1:7/,
  );
});

test("short-circuits a cross-type false result in an equality chain", () => {
  assert.deepEqual(evaluate("1 == true == 1"), {
    type: "Boolean",
    value: false,
  });
});

test("supports a later cross-type comparison in an equality chain", () => {
  assert.deepEqual(evaluate("1 == 1 != false"), {
    type: "Boolean",
    value: true,
  });
});

test("parentheses create a separate comparison result", () => {
  assert.deepEqual(evaluate("(1 < 2) == true"), {
    type: "Boolean",
    value: true,
  });
});
