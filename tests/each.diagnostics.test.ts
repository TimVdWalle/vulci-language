// Phase 17

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { evaluateCollectionSource as evaluate } from "./collection-test-helpers.ts";

test("reports E_MEM_TYPE before binding or body execution", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$runs = 0
1.each(item) {
  $runs = $runs + 1
}.missing()`,
        environment,
      ),
    /E_MEM_TYPE/,
  );
  assert.deepEqual(environment.get("$runs"), integer(0));
  assert.throws(() => environment.get("item"), /Undefined variable/);
});

test("rejects two bindings for strings, lists, and sets", () => {
  for (const receiver of ['"text"', "list[1]", "set[1]"]) {
    assert.throws(
      () => evaluate(`${receiver}.each(item, extra) {\n}`),
      /requires exactly one binding/,
    );
  }

  const program = new Parser(
    new Lexer('map["key": 1].each(value, key) { }').lex(),
  ).parse();
  const statement = program.statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "EachExpression");
  if (statement.expression.type !== "EachExpression") assert.fail();
  statement.expression.bindings.push(statement.expression.bindings[0]!);
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(program),
    /requires one or two bindings.*received 3/,
  );
});

test("validates typed bindings before the body and later chains", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$runs = 0
$later = 0
list[1, "wrong", 3].each(int item) {
  $runs = $runs + 1
}.add(($later = $later + 1))`,
        environment,
      ),
    /expects int, but received str/,
  );
  assert.deepEqual(environment.get("$runs"), integer(1));
  assert.deepEqual(environment.get("$later"), integer(0));
  assert.throws(() => environment.get("item"), /Undefined variable/);
});

test("validates map value and key bindings independently", () => {
  assert.deepEqual(
    evaluate(`$runs = 0
map["a": 1].each(int value, str key) {
  $runs = $runs + value
}
$runs`),
    integer(1),
  );
  assert.throws(
    () => evaluate('map["a": 1].each(str value, str key) {\n}'),
    /binding 'value' expects str, but received int/,
  );
  assert.throws(
    () => evaluate('map["a": 1].each(int value, int key) {\n}'),
    /binding 'key' expects int, but received str/,
  );
});

test("enforces typed-binding reassignment restrictions", () => {
  assert.deepEqual(
    evaluate(`$seen = 0
list[1].each(int item) {
  item = 2
  $seen = item
}
$seen`),
    integer(2),
  );
  assert.throws(
    () =>
      evaluate(`list[1].each(int item) {
  item = "wrong"
}`),
    /Cannot assign string to each binding 'item': expected int/,
  );
});

test("accepts supported explicit binding type forms", () => {
  assert.deepEqual(
    evaluate(`struct Box {
  int value
}
enum Status { Ready }
$runs = 0
list[list[1]].each(list<int> item) {
  $runs = $runs + 1
}
list[(1, "a")].each(tuple(int, str) item) {
  $runs = $runs + 1
}
list[Box(value: 1)].each(Box item) {
  $runs = $runs + 1
}
list[Status.Ready].each(Status item) {
  $runs = $runs + 1
}
list[1, "two"].each(int|str item) {
  $runs = $runs + 1
}
list[list[1]].each(collection item) {
  $runs = $runs + 1
}
list[list[1]].each(list item) {
  $runs = $runs + 1
}
list[null].each(any item) {
  $runs = $runs + 1
}
$runs`),
    integer(9),
  );
});

test("reports an unknown deferred binding type during validation", () => {
  const program = new Parser(
    new Lexer("list[1].each(Missing item) {\n}").lex(),
    { allowUnknownTypeNames: true },
  ).parse();

  assert.throws(
    () => new Evaluator(new Environment()).evaluate(program),
    /Unknown type name 'Missing'/,
  );
});

test("rejects visible local, parameter, and enclosing loop shadowing", () => {
  assert.throws(
    () =>
      evaluate(`fn invalid(int item) returns null {
  list[1].each(item) {
  }
  null
}
invalid(1)`),
    /conflicts with an already-visible binding/,
  );
  assert.throws(
    () =>
      evaluate(`fn invalid() returns null {
  item = 1
  list[1].each(item) {
  }
  null
}
invalid()`),
    /conflicts with an already-visible binding/,
  );
  assert.throws(
    () =>
      evaluate(`list[1].each(item) {
  list[2].each(item) {
  }
}`),
    /conflicts with an already-visible binding/,
  );
});

test("does not expose a top-level each binding to called functions", () => {
  assert.throws(
    () =>
      evaluate(`fn read() returns int {
  item
}
list[1].each(item) {
  read()
}`),
    /Undefined variable 'item'/,
  );
});

test("treats each bindings as ordinary call-shadowing values", () => {
  assert.throws(
    () =>
      evaluate(`fn item() returns int {
  7
}
list[1].each(item) {
  item()
}`),
    /Cannot call 'item': value is not a function/,
  );
});

test("rejects binding names reserved by struct and enum declarations", () => {
  assert.throws(
    () =>
      evaluate(`struct Box {}
list[1].each(int Box) {
}`),
    /E_STRUCT_DUP/,
  );
  assert.throws(
    () =>
      evaluate(`enum Status { Ready }
list[1].each(int Status) {
}`),
    /E_ENUM_DUP/,
  );
});

test("removes temporary bindings after normal and abrupt completion", () => {
  const completedEnvironment = new Environment();
  evaluate("list[1].each(item) {\n}", completedEnvironment);
  assert.throws(() => completedEnvironment.get("item"), /Undefined variable/);

  const failedEnvironment = new Environment();
  assert.throws(
    () =>
      evaluate(
        `list[1].each(item) {
  missing
}`,
        failedEnvironment,
      ),
    /Undefined variable 'missing'/,
  );
  assert.throws(() => failedEnvironment.get("item"), /Undefined variable/);
});

test("does not turn an each body into a top-level local scope", () => {
  assert.throws(
    () =>
      evaluate(`list[1].each(item) {
  local = item
}`),
    /Top-level variable 'local' must use the '\$' global-variable prefix/,
  );
});

test("stops traversal and later chaining after a body error", () => {
  const environment = new Environment();

  assert.throws(
    () =>
      evaluate(
        `$runs = 0
$later = 0
list[1, 2, 3].each(item) {
  $runs = $runs + 1
  if (item == 2) {
    missing
  } else {
    null
  }
}.add(($later = $later + 1))`,
        environment,
      ),
    /Undefined variable 'missing'/,
  );
  assert.deepEqual(environment.get("$runs"), integer(2));
  assert.deepEqual(environment.get("$later"), integer(0));
});

test("keeps return, break, and continue control rules", () => {
  assert.throws(
    () => evaluate("list[1].each(item) {\n  return item\n}"),
    /'return' can only be used inside a function/,
  );
  assert.throws(
    () => evaluate("list[1].each(item) {\n  break\n}"),
    /Undefined variable 'break'/,
  );
  assert.throws(
    () => evaluate("list[1].each(item) {\n  continue\n}"),
    /Undefined variable 'continue'/,
  );
});

function integer(value: number) {
  return { type: "Integer" as const, value };
}
