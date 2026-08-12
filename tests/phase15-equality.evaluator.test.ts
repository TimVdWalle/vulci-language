// Phase 15

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";

function evaluate(source: string): RuntimeValue {
  return new Evaluator(new Environment()).evaluate(
    new Parser(new Lexer(source).lex()).parse(),
  );
}

test("compares tuples structurally", () => {
  assert.deepEqual(evaluate('(1, "two", true) == (1, "two", true)'), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate('(1, "two", true) != (1, "two", false)'), {
    type: "Boolean",
    value: true,
  });
});

test("treats tuple arity as part of equality", () => {
  assert.deepEqual(evaluate("(1, 2) == (1, 2, 3)"), {
    type: "Boolean",
    value: false,
  });
});

test("compares nested tuples recursively", () => {
  assert.deepEqual(evaluate("((1, 2), (3, 4)) == ((1, 2), (3, 4))"), {
    type: "Boolean",
    value: true,
  });
});

test("treats cross-runtime-type tuple members as unequal", () => {
  assert.deepEqual(evaluate("(1, true) == (1, 1)"), {
    type: "Boolean",
    value: false,
  });
});

test("compares unsupported value kinds successfully across runtime types", () => {
  assert.deepEqual(evaluate("object(value: 1) == null"), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("object(value: 1) != (1, 2)"), {
    type: "Boolean",
    value: true,
  });
});

test("propagates unsupported same-type member equality", () => {
  assert.throws(
    () => evaluate("(object(value: 1), 2) == (object(value: 1), 2)"),
    /requires operands of the same type/,
  );
});
