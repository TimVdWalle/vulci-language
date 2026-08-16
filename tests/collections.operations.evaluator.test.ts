// Phase 16

import assert from "node:assert/strict";
import test from "node:test";
import { registerBuiltins } from "../src/builtins.js";
import { Environment } from "../src/environment.js";
import { NULL_VALUE } from "../src/runtime-value.js";
import {
  evaluateCollectionSource as evaluate,
  evaluateCollectionSourceWithBuiltins as evaluateWithBuiltins,
} from "./collection-test-helpers.ts";

test("adds to and removes from lists immutably", () => {
  assert.deepEqual(
    evaluate(`$original = list[1, 2, 1]
$added = $original.add(3)
$removed = $added.remove(1)
$missing = $removed.remove(99)
($original, $added, $removed, $missing)`),
    {
      type: "Tuple",
      members: [
        {
          type: "List",
          items: [1, 2, 1].map(integer),
        },
        {
          type: "List",
          items: [1, 2, 1, 3].map(integer),
        },
        {
          type: "List",
          items: [2, 1, 3].map(integer),
        },
        {
          type: "List",
          items: [2, 1, 3].map(integer),
        },
      ],
    },
  );
});

test("adds to and removes from insertion-ordered sets immutably", () => {
  assert.deepEqual(
    evaluate(`$original = set[2, 1, 2]
$same = $original.add(1)
$added = $same.add(3)
$removed = $added.remove(1)
($original, $same, $added, $removed)`),
    {
      type: "Tuple",
      members: [
        { type: "Set", items: [2, 1].map(integer) },
        { type: "Set", items: [2, 1].map(integer) },
        { type: "Set", items: [2, 1, 3].map(integer) },
        { type: "Set", items: [2, 3].map(integer) },
      ],
    },
  );
});

test("adds absent map keys last without replacing existing keys", () => {
  assert.deepEqual(
    evaluate(`$original = map["a": 1]
$added = $original.add(value: 2, key: "b")
($original, $added, $added.contains("b"))`),
    {
      type: "Tuple",
      members: [
        {
          type: "Map",
          entries: [{ key: string("a"), value: integer(1) }],
        },
        {
          type: "Map",
          entries: [
            { key: string("a"), value: integer(1) },
            { key: string("b"), value: integer(2) },
          ],
        },
        { type: "Boolean", value: true },
      ],
    },
  );

  assert.throws(() => evaluate('map["a": 1].add("a", 1)'), /Duplicate map key/);
  assert.throws(
    () => evaluate('map["a": 1].add(list[], 2)'),
    /Map keys must be/,
  );
});

test("implements contains for lists, sets, and map keys", () => {
  assert.deepEqual(
    evaluate(`list[
  list[1, 2].contains(2),
  list[1].contains("1"),
  set[list[1]].contains(list[1]),
  map["a": 1].contains("a"),
  map["a": 1].contains("missing"),
]`),
    {
      type: "List",
      items: [true, false, true, true, false].map((value) => ({
        type: "Boolean",
        value,
      })),
    },
  );
  assert.throws(() => evaluate('map["a": 1].contains((1, 2))'), /Map keys/);
});

test("uses structural collection equality recursively", () => {
  const cases: Array<[string, boolean]> = [
    ["list[1, list[2]] == list[1, list[2]]", true],
    ["list[1, 2] == list[2, 1]", false],
    ["set[1, 2] == set[2, 1]", true],
    ["set[list[1], list[2]] == set[list[2], list[1]]", true],
    ['map["a": 1, "b": list[2]] == map["b": list[2], "a": 1]', true],
    ['map["a": 1] != map["a": 2]', true],
    ["list[1] == set[1]", false],
  ];

  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source), {
      type: "Boolean",
      value: expected,
    });
  }
});

test("preserves unsupported nested equality instead of inventing it", () => {
  assert.throws(
    () => evaluate("list[object(value: 1)] == list[object(value: 1)]"),
    /requires operands of the same type/,
  );
  assert.throws(
    () => evaluate("list[object(value: 1)].contains(object(value: 1))"),
    /Equality is not supported/,
  );
});

test("reports unsupported collection members and argument failures", () => {
  assert.throws(() => evaluate("map[].remove(1)"), /E_MEM_UNKNOWN/);
  assert.throws(() => evaluate("list[].missing()"), /E_MEM_UNKNOWN/);
  assert.throws(() => evaluate("list[].add()"), /E_ARG_COUNT/);
  assert.throws(() => evaluate("map[].add(1)"), /E_ARG_COUNT/);
  assert.throws(
    () => evaluate("map[].add(other: 1, value: 2)"),
    /no parameter named 'other'/,
  );
  assert.throws(
    () => evaluate("map[].add(1, key: 2)"),
    /supplied more than once/,
  );
});

test("defers broad-collection operation errors until the path is reached", () => {
  const source = `fn maybe_remove(collection values, bool remove) returns collection {
  if (remove) {
    return values.remove(1)
  }
  values
}
maybe_remove(map["a": 1], false)`;

  assert.deepEqual(evaluate(source), {
    type: "Map",
    entries: [{ key: string("a"), value: integer(1) }],
  });
  assert.throws(
    () => evaluate(source.replace("false)", "true)")),
    /E_MEM_UNKNOWN/,
  );
});

test("prints deterministic concrete collection forms with escaped strings", () => {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]) => {
    output.push(values.map(String).join(" "));
  };

  try {
    evaluateWithBuiltins(
      'print(list[1, set[2, 1], map["x": list["a\\n\\t\\r\\\\\\""]]])',
    );
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(output, [
    'list[1, set[2, 1], map["x": list["a\\n\\t\\r\\\\\\""]]]',
  ]);
});

test("prints a false Boolean value", () => {
  const output: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]) => output.push(values);

  try {
    evaluateWithBuiltins("print(false)");
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(output, [["false"]]);
});

test("prints native functions nested in runtime collections", () => {
  const environment = new Environment();
  const output: unknown[][] = [];
  const originalLog = console.log;
  environment.define("provide", {
    type: "NativeFunction",
    parameters: [],
    call: () => ({
      type: "List",
      items: [{ type: "NativeFunction", call: () => NULL_VALUE }],
    }),
  });
  registerBuiltins(environment);
  console.log = (...values: unknown[]) => output.push(values);

  try {
    evaluate("print(provide())", environment);
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(output, [["list[]"]]);
});

function integer(value: number) {
  return { type: "Integer" as const, value };
}

function string(value: string) {
  return { type: "String" as const, value };
}
