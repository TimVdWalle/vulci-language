// Phase 17

import assert from "node:assert/strict";
import test from "node:test";
import { Expression } from "../src/ast.js";
import { parseCollectionSource as parse } from "./collection-test-helpers.ts";

function parseExpression(source: string, index = 0): Expression {
  const statement = parse(source).statements[index];
  assert.equal(statement?.type, "ExpressionStatement");
  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }
  return statement.expression;
}

test("parses a receiver-attached each expression and following chain", () => {
  const expression = parseExpression(`list[1].add(2).each(int|str item,) {
  item
}.contains(2)`);

  assert.equal(expression.type, "MemberCall");
  if (
    expression.type !== "MemberCall" ||
    expression.receiver.type !== "EachExpression"
  ) {
    return;
  }

  const each = expression.receiver;
  assert.equal(each.receiver.type, "MemberCall");
  assert.equal(each.keyword.lexeme, "each");
  assert.equal(each.bindings.length, 1);
  assert.equal(each.bindings[0]?.name.lexeme, "item");
  assert.deepEqual(
    each.bindings[0]?.bindingType?.members.map((member) => member.lexeme),
    ["int", "str"],
  );
  assert.equal(each.expressions[0]?.type, "VariableReference");
  assert.equal(expression.member.lexeme, "contains");
});

test("parses independently typed map bindings and an empty body", () => {
  const expression = parseExpression(`map["a": 1].each(
  int value,
  str key,
) {
}`);

  assert.equal(expression.type, "EachExpression");
  if (expression.type !== "EachExpression") return;
  assert.deepEqual(
    expression.bindings.map((binding) => binding.name.lexeme),
    ["value", "key"],
  );
  assert.deepEqual(
    expression.bindings.map(
      (binding) => binding.bindingType?.members[0]?.lexeme,
    ),
    ["int", "str"],
  );
  assert.deepEqual(expression.expressions, []);
});

test("accepts collection, tuple, and declared binding types", () => {
  const source = `struct Box {
  int value
}
list[list[1]].each(list<int> item) {
}
list[(1, "a")].each(tuple(int, str) pair) {
}
list[Box(value: 1)].each(Box box) {
}`;

  for (const index of [1, 2, 3]) {
    assert.equal(parseExpression(source, index).type, "EachExpression");
  }
});

test("parses nested each expressions with distinct bindings", () => {
  const outer = parseExpression(`list[1].each(outerItem) {
  set[2].each(innerItem) {
    innerItem
  }
}`);

  assert.equal(outer.type, "EachExpression");
  if (outer.type !== "EachExpression") return;
  assert.equal(outer.expressions[0]?.type, "EachExpression");
});

test("rejects missing or malformed each delimiters", () => {
  assert.throws(() => parse("list[].each {}"), /Expected '\('/);
  assert.throws(() => parse("list[].each(item)"), /Expected '\{'/);
  assert.throws(() => parse("list[].each(item {\n}"), /Expected '\)'/);
  assert.throws(() => parse("list[].each(item) {"), /Expected '\}'/);
  assert.throws(() => parse("each(list[], item) {\n}"));
});

test("rejects invalid binding lists and callback-like forms", () => {
  assert.throws(() => parse("list[].each() {\n}"), /at least one binding/);
  assert.throws(() => parse("list[].each(, item) {\n}"), /before ','/);
  assert.throws(() => parse("list[].each(|int item) {\n}"), /cannot start/);
  assert.throws(
    () => parse("list[].each(one, two, three) {\n}"),
    /at most two bindings/,
  );
  assert.throws(
    () => parse("map[].each(item, item) {\n}"),
    /Duplicate each binding/,
  );
  assert.throws(
    () => parse("list[].each($item) {\n}"),
    /cannot be global identifiers/,
  );
  assert.throws(
    () => parse("list[].each(int $item) {\n}"),
    /cannot be global identifiers/,
  );
  assert.throws(() => parse("list[].each((item)) {\n}"), /binding name/);
  assert.throws(() => parse("list[].each(item + 1) {\n}"), /Expected '\)'/);
  assert.throws(() => parse("list[].each(handler()) {\n}"), /Expected '\)'/);
  assert.throws(() => parse("list[].each(handler)"), /Expected '\{'/);
});

test("reports incomplete and unreachable each bodies", () => {
  assert.throws(
    () => parse("list[].each(item) {\n  item"),
    /Expected '}' after each body/,
  );
  assert.throws(
    () =>
      parse(`list[1].each(item) {
  return item
  item
}`),
    /Unreachable expression after unconditional return/,
  );
});

test("finds assignments inside each expressions used as defaults", () => {
  assert.throws(
    () =>
      parse(`fn invalid(any values = list[1].each(item) {
  $changed = item
}) returns any {
  values
}`),
    /Assignments are not allowed in default parameter values/,
  );
});

test("untyped bindings emit no warning", () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => warnings.push(values.join(" "));

  try {
    parse("list[1].each(item) {\n}");
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(warnings, []);
});
