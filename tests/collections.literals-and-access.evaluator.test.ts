// Phase 16

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { evaluateCollectionSource as evaluate } from "./collection-test-helpers.ts";

test("evaluates heterogeneous and empty collection literals", () => {
  assert.deepEqual(evaluate('list[1, "two", true, null, list[]]'), {
    type: "List",
    items: [
      { type: "Integer", value: 1 },
      { type: "String", value: "two" },
      { type: "Boolean", value: true },
      { type: "Null" },
      { type: "List", items: [] },
    ],
  });
  assert.deepEqual(evaluate("set[]"), { type: "Set", items: [] });
  assert.deepEqual(evaluate("map[]"), { type: "Map", entries: [] });
});

test("evaluates list and set items once from left to right", () => {
  assert.deepEqual(
    evaluate(`$order = 0
$items = list[
  ($order = $order * 10 + 1),
  ($order = $order * 10 + 2),
]
($items, $order)`),
    {
      type: "Tuple",
      members: [
        {
          type: "List",
          items: [
            { type: "Integer", value: 1 },
            { type: "Integer", value: 12 },
          ],
        },
        { type: "Integer", value: 12 },
      ],
    },
  );

  assert.deepEqual(
    evaluate(`$count = 0
$values = set[
  (($count = $count + 1) - 1),
  (($count = $count + 1) - 2),
]
($values, $count)`),
    {
      type: "Tuple",
      members: [
        { type: "Set", items: [{ type: "Integer", value: 0 }] },
        { type: "Integer", value: 2 },
      ],
    },
  );
});

test("evaluates map keys before values and entries from left to right", () => {
  assert.deepEqual(
    evaluate(`$order = 0
$lookup = map[
  ($order = $order * 10 + 1): ($order = $order * 10 + 2),
  ($order = $order * 10 + 3): ($order = $order * 10 + 4),
]
($lookup, $order)`),
    {
      type: "Tuple",
      members: [
        {
          type: "Map",
          entries: [
            {
              key: { type: "Integer", value: 1 },
              value: { type: "Integer", value: 12 },
            },
            {
              key: { type: "Integer", value: 123 },
              value: { type: "Integer", value: 1234 },
            },
          ],
        },
        { type: "Integer", value: 1234 },
      ],
    },
  );
});

test("validates a map key before evaluating its value", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$count = 0
map[list[]: ($count = $count + 1)]`,
        environment,
      ),
    /Map keys must be/,
  );
  assert.deepEqual(environment.get("$count"), {
    type: "Integer",
    value: 0,
  });
});

test("rejects a duplicate map key before its value and later entries", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$count = 0
map[
  "x": ($count = $count + 1),
  "x": ($count = $count + 10),
  "y": ($count = $count + 100),
]`,
        environment,
      ),
    /Duplicate map key/,
  );
  assert.deepEqual(environment.get("$count"), {
    type: "Integer",
    value: 1,
  });
});

test("supports list and Unicode-grapheme string indexing", () => {
  assert.deepEqual(evaluate("list[10, 20][1]"), {
    type: "Integer",
    value: 20,
  });
  assert.deepEqual(evaluate('"á👨‍👩‍👧‍👦"[0]'), {
    type: "String",
    value: "á",
  });
  assert.deepEqual(evaluate('"á👨‍👩‍👧‍👦"[1]'), {
    type: "String",
    value: "👨‍👩‍👧‍👦",
  });
});

test("supports every initially eligible map-key type", () => {
  assert.deepEqual(
    evaluate(`enum Status {
  Ready
}
$lookup = map[
  "name": 1,
  2: 3,
  true: 4,
  Status.Ready: 5,
]
list[$lookup["name"], $lookup[2], $lookup[true], $lookup[Status.Ready]]`),
    {
      type: "List",
      items: [1, 3, 4, 5].map((value) => ({
        type: "Integer",
        value,
      })),
    },
  );
});

test("keeps enum map keys nominally distinct", () => {
  assert.deepEqual(
    evaluate(`enum Left { Ready }
enum Right { Ready }
$lookup = map[Left.Ready: 1, Right.Ready: 2]
($lookup[Left.Ready], $lookup[Right.Ready])`),
    {
      type: "Tuple",
      members: [
        { type: "Integer", value: 1 },
        { type: "Integer", value: 2 },
      ],
    },
  );
});

test("reports positional, set, and keyed-access errors", () => {
  assert.throws(() => evaluate("list[1][true]"), /IDX_TYPE/);
  assert.throws(() => evaluate("list[1][-1]"), /IDX_RANGE/);
  assert.throws(() => evaluate("list[1][1]"), /IDX_RANGE/);
  assert.throws(() => evaluate("set[1][0]"), /IDX_TARGET/);
  assert.throws(() => evaluate('map["x": 1]["missing"]'), /not found/);
  assert.throws(() => evaluate('map["x": 1][list[]]'), /Map keys must be/);
});

test("stores and accesses value-semantic members independently", () => {
  assert.deepEqual(
    evaluate(`struct Box {
  int value
}
$box = Box(value: 1)
$items = list[$box]
$box.value = 2
$copy = $items[0]
$copy.value = 3
($items[0].value, $box.value, $copy.value)`),
    {
      type: "Tuple",
      members: [
        { type: "Integer", value: 1 },
        { type: "Integer", value: 2 },
        { type: "Integer", value: 3 },
      ],
    },
  );
});
