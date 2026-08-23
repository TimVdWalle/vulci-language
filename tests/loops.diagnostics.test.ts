// Phase 18

import assert from "node:assert/strict";
import test from "node:test";
import { registerBuiltins } from "../src/builtins.js";
import { Environment } from "../src/environment.js";
import { evaluateCollectionSource as evaluate } from "./collection-test-helpers.ts";

test("reports counted-loop receiver diagnostics at times", () => {
  assert.throws(
    () => evaluate('"three".times() { }'),
    /E_MEM_TYPE: Type 'string' does not support member 'times'\. at 1:9/,
  );
  assert.throws(
    () => evaluate("(-1).times() { }"),
    /E_TIMES_COUNT: '\.times' receiver must be zero or greater\. at 1:6/,
  );
});

test("validates counted receivers before binding or body execution", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$runs = 0
"wrong".times(index) {
  $runs = $runs + 1
}`,
        environment,
      ),
    /E_MEM_TYPE/,
  );
  assert.deepEqual(environment.get("$runs"), integer(0));
  assert.throws(() => environment.get("index"), /Undefined variable/);
});

test("reports non-Boolean while conditions at while", () => {
  assert.throws(
    () => evaluate("while (1) { }"),
    /E_WHILE_COND: 'while' requires a Boolean condition\. at 1:1/,
  );
});

test("reports break context at the reserved keyword", () => {
  assert.throws(
    () => evaluate("break"),
    /E_BREAK_CONTEXT: 'break' can only be used inside a loop\. at 1:1/,
  );
});

test("stops loops and later chains after runtime errors", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$runs = 0
$later = 0
3.times(index) {
  $runs = $runs + 1
  if (index == 1) {
    missing
  } else {
    null
  }
}.times() {
  $later = $later + 1
}`,
        environment,
      ),
    /Undefined variable 'missing'/,
  );
  assert.deepEqual(environment.get("$runs"), integer(2));
  assert.deepEqual(environment.get("$later"), integer(0));
  assert.throws(() => environment.get("index"), /Undefined variable/);
});

test("rejects visible counted-loop binding conflicts", () => {
  for (const source of [
    `fn invalid(int index) returns null {
  1.times(index) { }
  null
}
invalid(1)`,
    `fn invalid() returns null {
  index = 1
  1.times(index) { }
  null
}
invalid()`,
    `1.times(index) {
  1.times(index) { }
}`,
    `list[1].each(index) {
  1.times(index) { }
}`,
  ]) {
    assert.throws(
      () => evaluate(source),
      /Times binding 'index' conflicts with an already-visible binding/,
    );
  }
});

test("rejects counted bindings reserved by declarations", () => {
  assert.throws(
    () => evaluate("struct Box {}\n1.times(Box) { }"),
    /E_STRUCT_DUP/,
  );
  assert.throws(
    () => evaluate("enum Status { Ready }\n1.times(Status) { }"),
    /E_ENUM_DUP/,
  );
});

test("keeps native names available after top-level counted loops", () => {
  const environment = new Environment();
  registerBuiltins(environment);
  const original = environment.get("print");

  evaluate("1.times(print) { }", environment);
  assert.equal(environment.get("print"), original);
});

test("removes a counted binding after break completion", () => {
  const environment = new Environment();

  evaluate("2.times(index) { break }", environment);
  assert.throws(() => environment.get("index"), /Undefined variable/);
});

test("does not expose a caller counted binding inside called functions", () => {
  assert.throws(
    () =>
      evaluate(`fn read() returns int {
  index
}
1.times(index) {
  read()
}`),
    /Undefined variable 'index'/,
  );
});

test("a language loop body wins over a same-named struct method", () => {
  assert.throws(
    () =>
      evaluate(`struct Counter {
  fn times() returns int { 1 }
}
Counter().times() { }`),
    /E_MEM_TYPE: Type 'Counter' does not support member 'times'/,
  );
});

function integer(value: number) {
  return { type: "Integer" as const, value };
}
