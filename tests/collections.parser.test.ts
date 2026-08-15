// Phase 16

import assert from "node:assert/strict";
import test from "node:test";
import { Expression } from "../src/ast.js";
import { parseCollectionSource as parse } from "./collection-test-helpers.ts";

function parseExpression(source: string): Expression {
  const statement = parse(source).statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }
  return statement.expression;
}

test("parses list and set literals with empty and trailing-comma forms", () => {
  const list = parseExpression(`list[
  1,
  "two",
  true,
]`);
  const set = parseExpression("set[]");

  assert.equal(list.type, "ListLiteral");
  assert.equal(set.type, "SetLiteral");
  if (list.type !== "ListLiteral" || set.type !== "SetLiteral") return;
  assert.equal(list.items.length, 3);
  assert.equal(set.items.length, 0);
});

test("parses map entries and an optional trailing comma", () => {
  const map = parseExpression(`map[
  "one": 1,
  true: list[2, 3],
]`);

  assert.equal(map.type, "MapLiteral");
  if (map.type !== "MapLiteral") return;
  assert.equal(map.entries.length, 2);
  assert.equal(map.entries[0]?.key.type, "StringLiteral");
  assert.equal(map.entries[1]?.value.type, "ListLiteral");
});

test("parses postfix access and calls after collection literals", () => {
  const indexed = parseExpression("list[list[1]][0][0]");
  const called = parseExpression("set[1].add(2).contains(2)");

  assert.equal(indexed.type, "IndexExpression");
  assert.equal(called.type, "MemberCall");
});

test("rejects malformed collection literals", () => {
  assert.throws(() => parse("list[,1]"), /Expected list item/);
  assert.throws(() => parse("set[1,,2]"), /Expected set item/);
  assert.throws(() => parse('map["a" 1]'), /Expected ':'/);
  assert.throws(() => parse('map[,"a": 1]'), /Expected map entry/);
  assert.throws(() => parse("list[1"), /Expected ']'/);
  assert.throws(() => parse('map["a": 1'), /Expected ']'/);
});

test("detects assignments nested inside collection default values", () => {
  assert.throws(
    () =>
      parse(`fn invalid(any value = list[($changed = 1)]) returns any {
  value
}`),
    /Assignments are not allowed in default parameter values/,
  );
  assert.throws(
    () =>
      parse(`fn invalid(any value = map["x": ($changed = 1)]) returns any {
  value
}`),
    /Assignments are not allowed in default parameter values/,
  );
});
