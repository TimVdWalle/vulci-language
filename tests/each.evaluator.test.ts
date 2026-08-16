// Phase 17

import assert from "node:assert/strict";
import test from "node:test";
import { registerBuiltins } from "../src/builtins.js";
import { Environment } from "../src/environment.js";
import { RuntimeValue } from "../src/runtime-value.js";
import { evaluateCollectionSource as evaluate } from "./collection-test-helpers.ts";

test("traverses strings, lists, sets, and maps in their defined order", () => {
  assert.deepEqual(
    evaluate(`$textOrder = ""
"á👨‍👩‍👧‍👦".each(grapheme) {
  $textOrder = $textOrder + grapheme
}
$listOrder = 0
list[1, 2, 3].each(item) {
  $listOrder = $listOrder * 10 + item
}
$setOrder = 0
set[2, 1, 2, 3].each(item) {
  $setOrder = $setOrder * 10 + item
}
$mapOrder = ""
map["b": "B", "a": "A"].each(value, key) {
  $mapOrder = $mapOrder + key + value
}
($textOrder, $listOrder, $setOrder, $mapOrder)`),
    {
      type: "Tuple",
      members: [string("á👨‍👩‍👧‍👦"), integer(123), integer(213), string("bBaA")],
    },
  );
});

test("binds a map value first and its optional key second", () => {
  assert.deepEqual(
    evaluate(`$values = 0
map["a": 2, "b": 3].each(value) {
  $values = $values * 10 + value
}
$pairs = ""
map["x": "one"].each(value, key) {
  $pairs = key + value
}
($values, $pairs)`),
    {
      type: "Tuple",
      members: [integer(23), string("xone")],
    },
  );
});

test("evaluates the receiver once and returns it for later chaining", () => {
  assert.deepEqual(
    evaluate(`$calls = 0
fn values() returns list<int> {
  $calls = $calls + 1
  list[1, 2]
}
$result = values().each(item) {
  item + 100
}.add(3)
($calls, $result)`),
    {
      type: "Tuple",
      members: [
        integer(1),
        { type: "List", items: [integer(1), integer(2), integer(3)] },
      ],
    },
  );
});

test("returns an unchanged receiver for empty inputs and empty bodies", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
$empty = list[].each(item) {
  $runs = $runs + 1
}
$filled = set[2, 1].each(item) {
}
($runs, $empty, $filled)`),
    {
      type: "Tuple",
      members: [
        integer(0),
        { type: "List", items: [] },
        { type: "Set", items: [integer(2), integer(1)] },
      ],
    },
  );
});

test("resets reassigned bindings and does not mutate receiver items", () => {
  assert.deepEqual(
    evaluate(`$receiver = list[1, 2]
$seen = 0
$receiver.each(item) {
  item = item + 10
  $seen = $seen * 100 + item
}
($receiver, $seen)`),
    {
      type: "Tuple",
      members: [
        { type: "List", items: [integer(1), integer(2)] },
        integer(1112),
      ],
    },
  );
});

test("uses ordinary value semantics for each item binding", () => {
  assert.deepEqual(
    evaluate(`struct Box {
  int value
}
$boxes = list[Box(value: 1)]
$boxes.each(box) {
  box.value = 9
}
$boxes[0].value`),
    integer(1),
  );
});

test("keeps body locals in the surrounding function scope", () => {
  assert.deepEqual(
    evaluate(`fn inspect() returns tuple(int, int) {
  total = 0
  list[2, 3].each(item) {
    total = total + item
    latest = item
  }
  (total, latest)
}
inspect()`),
    {
      type: "Tuple",
      members: [integer(5), integer(3)],
    },
  );
});

test("allows top-level temporary bindings while keeping globals distinct", () => {
  assert.deepEqual(
    evaluate(`$item = 40
$sum = 0
list[1, 2].each(item) {
  $sum = $sum + item
}
($item, $sum)`),
    {
      type: "Tuple",
      members: [integer(40), integer(3)],
    },
  );
});

test("propagates return from each to its enclosing function", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
fn first(list<int> values) returns int {
  values.each(value) {
    $runs = $runs + 1
    return value
  }
  return 0
}
$result = first(list[4, 5])
($result, $runs)`),
    {
      type: "Tuple",
      members: [integer(4), integer(1)],
    },
  );
});

test("propagates return from each to its enclosing method", () => {
  assert.deepEqual(
    evaluate(`struct Picker {
  fn first() returns int {
    list[7, 8].each(item) {
      return item
    }
    return 0
  }
}
Picker().first()`),
    integer(7),
  );
});

test("supports ordinary nested each expressions", () => {
  assert.deepEqual(
    evaluate(`$total = 0
list[1, 2].each(outerItem) {
  list[10, 20].each(innerItem) {
    $total = $total + outerItem * innerItem
  }
}
$total`),
    integer(90),
  );
});

test("does not expose caller loop bindings inside called functions", () => {
  assert.deepEqual(
    evaluate(`fn increment(int item) returns int {
  item = item + 1
  item
}
$total = 0
list[1, 2].each(item) {
  $total = $total + increment(item)
}
$total`),
    integer(5),
  );
});

test("restores a native-function binding after top-level traversal", () => {
  const environment = new Environment();
  registerBuiltins(environment);
  const original = environment.get("print");

  assert.deepEqual(
    evaluate(
      `$seen = ""
list["temporary"].each(print) {
  $seen = print
}
$seen`,
      environment,
    ),
    string("temporary"),
  );

  assert.equal(environment.get("print"), original);
});

test("keeps ordinary native-value behavior for externally supplied items", () => {
  const environment = new Environment();
  let calls = 0;
  const action: RuntimeValue = {
    type: "NativeFunction",
    parameters: [],
    call() {
      calls++;
      return integer(3);
    },
  };
  environment.define("$actions", { type: "List", items: [action] });

  assert.deepEqual(
    evaluate(
      `$total = 0
$actions.each(action) {
  $total = $total + action
  $total = $total + action()
}
$total`,
      environment,
    ),
    integer(6),
  );
  assert.equal(calls, 2);
});

function integer(value: number): RuntimeValue {
  return { type: "Integer", value };
}

function string(value: string): RuntimeValue {
  return { type: "String", value };
}
