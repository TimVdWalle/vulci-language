// Phase 18

import assert from "node:assert/strict";
import test from "node:test";
import { RuntimeValue } from "../src/runtime-value.js";
import { evaluateCollectionSource as evaluate } from "./collection-test-helpers.ts";

test("repeats an integer count with a zero-based index", () => {
  assert.deepEqual(
    evaluate(`$seen = 0
3.times(index) {
  $seen = $seen * 10 + index
  index = "changed"
}
$seen`),
    integer(12),
  );
});

test("evaluates the counted receiver once and returns it unchanged", () => {
  assert.deepEqual(
    evaluate(`$calls = 0
fn count() returns int {
  $calls = $calls + 1
  2
}
$runs = 0
$result = count().times() {
  $runs = $runs + 1
}
($calls, $runs, $result)`),
    tuple(integer(1), integer(2), integer(2)),
  );
});

test("supports zero iterations and empty counted-loop bodies", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
$zero = 0.times(index) {
  $runs = $runs + 1
}
$filled = 2.times() {
}
($runs, $zero, $filled)`),
    tuple(integer(0), integer(0), integer(2)),
  );
});

test("keeps counted bindings temporary and body locals surrounding", () => {
  assert.deepEqual(
    evaluate(`$index = 40
fn inspect() returns tuple(int, int) {
  total = 0
  2.times(index) {
    total = total + index
    latest = index
  }
  (total, latest)
}
($index, inspect())`),
    tuple(integer(40), tuple(integer(1), integer(1))),
  );
});

test("break completes counted loops and permits later chaining", () => {
  assert.deepEqual(
    evaluate(`$first = 0
$second = 0
$result = 3.times(index) {
  $first = $first + 1
  break
}.times() {
  $second = $second + 1
}
($first, $second, $result)`),
    tuple(integer(1), integer(3), integer(3)),
  );
});

test("while rechecks its Boolean condition and returns null", () => {
  assert.deepEqual(
    evaluate(`$value = 0
$result = while ($value < 3) {
  $value = $value + 1
  99
}
($value, $result)`),
    tuple(integer(3), nullValue()),
  );
});

test("while evaluates its condition once per prospective iteration", () => {
  assert.deepEqual(
    evaluate(`$checks = 0
$runs = 0
fn keep_running() returns bool {
  $checks = $checks + 1
  $checks < 3
}
while (keep_running()) {
  $runs = $runs + 1
}
($checks, $runs)`),
    tuple(integer(3), integer(2)),
  );
});

test("an initially false while executes zero times", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
$result = while (false) {
  $runs = $runs + 1
}
($runs, $result)`),
    tuple(integer(0), nullValue()),
  );
});

test("nested loops consume only their nearest break", () => {
  assert.deepEqual(
    evaluate(`$outer = 0
$inner = 0
3.times() {
  $outer = $outer + 1
  while (true) {
    $inner = $inner + 1
    break
  }
}
($outer, $inner)`),
    tuple(integer(3), integer(3)),
  );
});

test("break exits each while preserving its receiver and chain", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
$result = list[1, 2, 3].each(item) {
  $runs = $runs + 1
  break
}.add(4)
($runs, $result)`),
    tuple(integer(1), {
      type: "List",
      items: [integer(1), integer(2), integer(3), integer(4)],
    }),
  );
});

test("conditional break does not stop a later outer expression statically", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
while ($runs < 2) {
  if ($runs == 5) {
    break
  }
  $runs = $runs + 1
}
$runs`),
    integer(2),
  );
});

test("return propagates through counted and condition-driven loops", () => {
  assert.deepEqual(
    evaluate(`fn from_times() returns int {
  3.times(index) {
    return index + 4
  }
  0
}
fn from_while() returns int {
  while (true) {
    return 8
  }
  0
}
(from_times(), from_while())`),
    tuple(integer(4), integer(8)),
  );
});

test("same-named struct methods remain ordinary calls without bodies", () => {
  assert.deepEqual(
    evaluate(`struct Counter {
  int value
  fn times(int amount) returns int {
    self.value + amount
  }
  fn each(int amount) returns int {
    self.value * amount
  }
}
$counter = Counter(value: 3)
($counter.times(2), $counter.each(4))`),
    tuple(integer(5), integer(12)),
  );
});

function integer(value: number): RuntimeValue {
  return { type: "Integer", value };
}

function nullValue(): RuntimeValue {
  return { type: "Null" };
}

function tuple(...members: RuntimeValue[]): RuntimeValue {
  return { type: "Tuple", members };
}
