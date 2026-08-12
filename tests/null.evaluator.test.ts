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

test("evaluates a null literal", () => {
  assert.deepEqual(evaluate("null"), {
    type: "Null",
  });
});

test("assigns null to a variable", () => {
  assert.deepEqual(
    evaluate(`$value = null
$value
`),
    {
      type: "Null",
    },
  );
});

test("evaluates null equality as true", () => {
  assert.deepEqual(evaluate("null == null"), {
    type: "Boolean",
    value: true,
  });
});

test("evaluates null inequality as false", () => {
  assert.deepEqual(evaluate("null != null"), {
    type: "Boolean",
    value: false,
  });
});

test("compares null and an Integer as unequal", () => {
  assert.deepEqual(evaluate("null == 1"), {
    type: "Boolean",
    value: false,
  });
});

test("compares null and a Boolean as unequal", () => {
  assert.deepEqual(evaluate("null != false"), {
    type: "Boolean",
    value: true,
  });
});

test("rejects ordering comparisons with null", () => {
  const cases = ["null < 1", "null <= 1", "null > 1", "null >= 1"];

  for (const source of cases) {
    assert.throws(
      () => evaluate(source),
      /requires two integers or two strings/,
    );
  }
});

test("returns null from an unmatched conditional without else", () => {
  assert.deepEqual(
    evaluate(`if (false) {
  1
}`),
    {
      type: "Null",
    },
  );
});

test("allows a branch to explicitly return null", () => {
  assert.deepEqual(
    evaluate(`if (true) {
  null
} else {
  1
}`),
    {
      type: "Null",
    },
  );
});

test("supports null equality inside conditional conditions", () => {
  assert.deepEqual(
    evaluate(`if (null == null) {
  1
} else {
  2
}`),
    {
      type: "Integer",
      value: 1,
    },
  );
});

test("passes null to native functions", () => {
  const environment = new Environment();
  const captured: RuntimeValue[] = [];

  environment.define("capture", {
    type: "NativeFunction",
    call(arguments_: RuntimeValue[]): RuntimeValue {
      captured.push(...arguments_);

      return {
        type: "Null",
      };
    },
  });

  const tokens = new Lexer("capture(null)").lex();
  const program = new Parser(tokens).parse();

  const result = new Evaluator(environment).evaluate(program);

  assert.deepEqual(captured, [
    {
      type: "Null",
    },
  ]);

  assert.deepEqual(result, {
    type: "Null",
  });
});
