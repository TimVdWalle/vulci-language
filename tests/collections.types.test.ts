// Phase 16

import assert from "node:assert/strict";
import test from "node:test";
import { FunctionDeclaration } from "../src/ast.js";
import {
  evaluateCollectionSource as evaluate,
  parseCollectionSource as parse,
} from "./collection-test-helpers.ts";

function getFunction(source: string): FunctionDeclaration {
  const statement = parse(source).statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  if (
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "FunctionDeclaration"
  ) {
    assert.fail("Expected a function declaration.");
  }
  return statement.expression;
}

function captureWarnings(action: () => unknown): string[] {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => {
    warnings.push(values.map(String).join(" "));
  };
  try {
    action();
  } finally {
    console.warn = originalWarn;
  }
  return warnings;
}

test("parses concrete typed collection boundary forms", () => {
  const declaration = getFunction(`fn transform(
  list<int|str> items,
  set<list<int>> groups,
  map<str, int|null,> lookup,
) returns map<any, list<any>> {
  map[]
}`);

  const parameterMembers = declaration.parameterTypes?.map(
    (annotation) => annotation?.members[0],
  );
  assert.deepEqual(
    parameterMembers?.map((member) => member?.type),
    ["CollectionType", "CollectionType", "CollectionType"],
  );
  assert.equal(parameterMembers?.[0]?.lexeme, "list");
  assert.equal(parameterMembers?.[1]?.lexeme, "set");
  assert.equal(parameterMembers?.[2]?.lexeme, "map");
  assert.equal(declaration.returnType?.members[0]?.type, "CollectionType");
});

test("warns for bare concrete boundaries but not explicit unrestricted forms", () => {
  const bareWarnings = captureWarnings(() =>
    parse(`fn accept(list items, set values, map lookup) returns list {
  items
}`),
  );
  assert.equal(bareWarnings.length, 4);
  assert.match(bareWarnings[0]!, /collection type 'list'/);
  assert.match(bareWarnings[1]!, /collection type 'set'/);
  assert.match(bareWarnings[2]!, /collection type 'map'/);
  assert.match(bareWarnings[3]!, /collection type 'list'/);

  const explicitWarnings = captureWarnings(() =>
    parse(`fn accept(
  list<any> items,
  set<any> values,
  map<any, any> lookup,
) returns map<str, any> {
  lookup
}`),
  );
  assert.deepEqual(explicitWarnings, []);
});

test("rejects malformed and unaccepted collection type forms", () => {
  assert.throws(() => parseFunctionType("list<>"), /requires type arguments/);
  assert.throws(() => parseFunctionType("list<int, str>"), /exactly 1/);
  assert.throws(() => parseFunctionType("set<int, bool>"), /exactly 1/);
  assert.throws(() => parseFunctionType("map<int>"), /exactly 2/);
  assert.throws(() => parseFunctionType("map<int,,str>"), /before ','/);
  assert.throws(() => parseFunctionType("collection<any>"), /does not accept/);
  assert.throws(() => parseFunctionType("list<any|int>"), /cannot appear/);
  assert.throws(() => parseFunctionType("list<Missing>"), /Unknown type/);
});

test("rejects collection types outside accepted type positions", () => {
  for (const fieldType of [
    "list",
    "list<int>",
    "collection",
    "tuple(int, list<int>)",
  ]) {
    assert.throws(
      () =>
        parse(`struct Invalid {
  ${fieldType} value
}`),
      /only at function boundaries and in type inspection/,
    );
  }
});

test("validates concrete typed parameters and returns by their contents", () => {
  assert.deepEqual(
    evaluate(`fn preserve(list<int|str> values) returns list<int|str> {
  values
}
preserve(list[1, "two"])`),
    {
      type: "List",
      items: [
        { type: "Integer", value: 1 },
        { type: "String", value: "two" },
      ],
    },
  );
  assert.throws(
    () =>
      evaluate(`fn accept(list<int> values) returns null {
  null
}
accept(list[1, "two"])`),
    /expects list<int>/,
  );
  assert.throws(
    () =>
      evaluate(`fn invalid() returns set<int> {
  set[1, "two"]
}
invalid`),
    /expects return type set<int>/,
  );
});

test("supports explicit and partially unrestricted collection boundaries", () => {
  assert.deepEqual(
    evaluate(`fn accept(map<any, int> values) returns map<any, any> {
  values
}
accept(map["one": 1, 2: 3])`),
    {
      type: "Map",
      entries: [
        {
          key: { type: "String", value: "one" },
          value: { type: "Integer", value: 1 },
        },
        {
          key: { type: "Integer", value: 2 },
          value: { type: "Integer", value: 3 },
        },
      ],
    },
  );
  assert.throws(
    () =>
      evaluate(`fn accept(map<any, int> values) returns null {
  null
}
accept(map["one": "wrong"])`),
    /expects map<any, int>/,
  );
});

test("implements bare, typed, unrestricted, and broad collection inspection", () => {
  const cases: Array<[string, boolean]> = [
    ["list[1, 2] is list", true],
    ["list[1, 2] is list<int>", true],
    ['list[1, "two"] is list<int>', false],
    ['list[1, "two"] is list<any>', true],
    ["set[] is set<int>", true],
    ['map["a": 1] is map<str, int>', true],
    ['map["a": 1] is map<any, any>', true],
    ["list[] is collection", true],
    ["set[] is collection", true],
    ["map[] is collection", true],
    ['"text" is collection', false],
    ["1 is collection", false],
    ["list[list[1]] is list<list<int>>", true],
    ["null is list<int>|null", true],
  ];

  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source), {
      type: "Boolean",
      value: expected,
    });
  }
});

test("preserves concrete runtime behavior through broad boundaries", () => {
  assert.deepEqual(
    evaluate(`fn add_one(collection values) returns collection {
  values.add(1)
}
add_one(list[2])`),
    {
      type: "List",
      items: [
        { type: "Integer", value: 2 },
        { type: "Integer", value: 1 },
      ],
    },
  );
  assert.throws(
    () =>
      evaluate(`fn accept(collection values) returns collection {
  values
}
accept("text")`),
    /expects collection/,
  );
});

test("keeps typed collection parameter reassignment restrictions", () => {
  assert.throws(
    () =>
      evaluate(`fn replace(list<int> values) returns list<int> {
  values = list["wrong"]
  values
}
replace(list[1])`),
    /expected list<int>/,
  );
});

test("does not accept concrete-kind inspection properties", () => {
  assert.throws(() => evaluate("list[].isList"), /E_MEM_TYPE/);
  assert.throws(() => evaluate("set[].isSet"), /E_MEM_TYPE/);
  assert.throws(() => evaluate("map[].isMap"), /E_MEM_TYPE/);
});

function parseFunctionType(type: string): void {
  captureWarnings(() =>
    parse(`fn accept(${type} value) returns null {
  null
}`),
  );
}
