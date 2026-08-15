// Phase 16

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { graphemesOf } from "../src/graphemes.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

function evaluate(source: string) {
  return new Evaluator(new Environment()).evaluate(
    new Parser(new Lexer(source).lex()).parse(),
  );
}

test("keeps interpolation-looking text literal in single quotes", () => {
  assert.deepEqual(evaluate("'{{name}}'"), {
    type: "String",
    value: "{{name}}",
  });
});

test("evaluates string concatenation and space joining", () => {
  assert.deepEqual(evaluate('"a" + "b"'), { type: "String", value: "ab" });
  assert.deepEqual(evaluate('"" ~ "b"'), { type: "String", value: " b" });
});

test("evaluates interpolation left to right", () => {
  assert.deepEqual(
    evaluate('$name = "Ada"\n"Hi {{$name}}, {{1 + 2}}, {{true}}"'),
    {
      type: "String",
      value: "Hi Ada, 3, true",
    },
  );
});

test("rejects unsupported interpolation result types", () => {
  assert.throws(() => evaluate('"{{null}}"'), /E_IPL_TYPE:/);
});

test("compares strings by exact code-point sequence", () => {
  assert.deepEqual(evaluate('"A" < "a"'), {
    type: "Boolean",
    value: true,
  });

  const composed = "\u00e9";
  const decomposed = "\u0065\u0301";

  assert.deepEqual(evaluate(`"${composed}" == "${decomposed}"`), {
    type: "Boolean",
    value: false,
  });
});

test("evaluates string contains", () => {
  assert.deepEqual(evaluate('"Hello".contains("ell")'), {
    type: "Boolean",
    value: true,
  });
});

test("counts extended grapheme clusters", () => {
  assert.deepEqual(evaluate('"👨‍👩‍👧‍👦á".count()'), {
    type: "Integer",
    value: 2,
  });
});

test("counts a decomposed grapheme as one grapheme", () => {
  const decomposed = "a\u0301";

  assert.deepEqual(evaluate(`"${decomposed}".count()`), {
    type: "Integer",
    value: 1,
  });
});

test("segments and caches externally supplied string values", () => {
  const value = { type: "String" as const, value: "a\u0301b" };
  const graphemes = graphemesOf(value);

  assert.deepEqual(graphemes, ["a\u0301", "b"]);
  assert.equal(graphemesOf(value), graphemes);
});

test("reports member diagnostics", () => {
  assert.throws(() => evaluate("1.count()"), /E_MEM_TYPE:/);
  assert.throws(() => evaluate('"x".missing()'), /E_MEM_UNKNOWN:/);
  assert.throws(() => evaluate('"x".count(1)'), /E_ARG_COUNT:/);
  assert.throws(() => evaluate('"x".contains(1)'), /E_ARG_TYPE:/);
});

test("accepts str parameter and return annotations", () => {
  assert.deepEqual(
    evaluate(`fn echo(str value) returns str {
  value
}
echo("ok")`),
    { type: "String", value: "ok" },
  );
});
