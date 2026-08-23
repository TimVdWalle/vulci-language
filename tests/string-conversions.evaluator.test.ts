// Phase 19

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

function evaluate(source: string) {
  return new Evaluator(new Environment()).evaluate(
    new Parser(new Lexer(source).lex()).parse(),
  );
}

test("converts complete ASCII decimal strings to integers", () => {
  for (const [source, value] of [
    ['"0".toInt()', 0],
    ['"42".toInt()', 42],
    ['"-42".toInt()', -42],
    ['"0019".toInt()', 19],
  ] as const) {
    assert.deepEqual(evaluate(source), { type: "Integer", value });
  }
});

test("rejects invalid and out-of-range integer conversions", () => {
  for (const source of [
    '"".toInt()',
    '"-".toInt()',
    '"+1".toInt()',
    '" 1".toInt()',
    '"1 ".toInt()',
    '"1_000".toInt()',
    '"1.0".toInt()',
    '"12x".toInt()',
    '"9007199254740992".toInt()',
  ]) {
    assert.throws(() => evaluate(source), /E_CONV_INT:.*at 1:/);
  }
});

test("converts only exact lowercase Boolean strings", () => {
  assert.deepEqual(evaluate('"true".toBool()'), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate('"false".toBool()'), {
    type: "Boolean",
    value: false,
  });

  for (const source of [
    '"True".toBool()',
    '"0".toBool()',
    '" true".toBool()',
  ]) {
    assert.throws(() => evaluate(source), /E_CONV_BOOL:.*at 1:/);
  }
});

test("requires zero conversion arguments", () => {
  assert.throws(() => evaluate('"1".toInt(1)'), /E_ARG_COUNT/);
  assert.throws(() => evaluate('"true".toBool(value: true)'), /E_ARG_COUNT/);
});
