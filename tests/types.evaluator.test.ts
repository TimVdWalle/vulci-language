// Phase 8

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";

function evaluate(source: string): RuntimeValue {
  const tokens = new Lexer(source).lex();
  const program = new Parser(tokens).parse();

  return new Evaluator(new Environment()).evaluate(program);
}

function evaluateWithoutWarnings(source: string): RuntimeValue {
  const originalWarn = console.warn;

  console.warn = () => undefined;

  try {
    return evaluate(source);
  } finally {
    console.warn = originalWarn;
  }
}

test("accepts an argument matching its parameter type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn double(int value) returns int {
  value * 2
}
double(21)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("rejects an argument with the wrong type", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn double(int value) returns int {
  value * 2
}
double(true)`),
    /Function 'double' parameter 'value' expects int, but received boolean\./,
  );
  assert.throws(
    () =>
      evaluateWithoutWarnings(`struct Box {}
fn requireInt(int value) returns int { value }
requireInt(Box())`),
    /expects int, but received Box/,
  );
});

test("accepts a bare set annotation", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(
      "fn preserve(set value) returns set { value }\npreserve(set[1])",
    ),
    { type: "Set", items: [{ type: "Integer", value: 1 }] },
  );
  assert.deepEqual(
    evaluateWithoutWarnings(
      'fn preserve(map value) returns map { value }\npreserve(map["key": 1])',
    ),
    {
      type: "Map",
      entries: [
        {
          key: { type: "String", value: "key" },
          value: { type: "Integer", value: 1 },
        },
      ],
    },
  );
});

test("accepts each member of a parameter union", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn preserve(int|bool value) returns int|bool {
  value
}
preserve(true)`),
    {
      type: "Boolean",
      value: true,
    },
  );

  assert.deepEqual(
    evaluateWithoutWarnings(`fn preserve(int|bool value) returns int|bool {
  value
}
preserve(42)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("rejects an argument outside a parameter union", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn preserve(int|bool value) returns int|bool {
  value
}
preserve(null)`),
    /expects int\|bool, but received null\./,
  );
});

test("explicit any accepts every available runtime type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn identity(any value) returns any {
  value
}
identity(null)`),
    {
      type: "Null",
    },
  );

  assert.deepEqual(
    evaluateWithoutWarnings(`fn identity(any value) returns any {
  value
}
identity(true)`),
    {
      type: "Boolean",
      value: true,
    },
  );
});

test("an omitted parameter type behaves as any", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn identity(value) returns any {
  value
}
identity(true)`),
    {
      type: "Boolean",
      value: true,
    },
  );
});

test("validates an explicit return value", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn broken() returns int {
  return true
}
broken()`),
    /Function 'broken' expects return type int, but returned boolean\./,
  );
});

test("validates an implicit final-expression return value", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn broken() returns int {
  true
}
broken()`),
    /Function 'broken' expects return type int, but returned boolean\./,
  );
});

test("treats a bare return as null", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn stop() returns int {
  return
}
stop()`),
    /Function 'stop' expects return type int, but returned null\./,
  );
});

test("accepts a bare return for a null return type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn stop() returns null {
  return
}
stop()`),
    {
      type: "Null",
    },
  );
});

test("accepts null in a return union", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn positiveOrNull(int value) returns int|null {
  if (value > 0) {
    return value
  }

  null
}
positiveOrNull(-1)`),
    {
      type: "Null",
    },
  );
});

test("accepts another member of a return union", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn positiveOrNull(int value) returns int|null {
  if (value > 0) {
    return value
  }

  null
}
positiveOrNull(5)`),
    {
      type: "Integer",
      value: 5,
    },
  );
});

test("rejects a value outside a return union", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn broken() returns int|null {
  true
}
broken()`),
    /expects return type int\|null, but returned boolean\./,
  );
});

test("allows reassignment that preserves a parameter type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn increment(int value) returns int {
  value = value + 1
  value
}
increment(41)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("rejects changing a single-typed parameter to another type", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn change(int value) returns int {
  value = true
  1
}
change(42)`),
    /Cannot assign boolean to parameter 'value' of function 'change': expected int\./,
  );
});

test("allows reassignment to another parameter union member", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn change(int|bool value) returns int|bool {
  value = true
  value
}
change(42)`),
    {
      type: "Boolean",
      value: true,
    },
  );
});

test("rejects reassignment outside a parameter union", () => {
  assert.throws(
    () =>
      evaluateWithoutWarnings(`fn change(int|bool value) returns int|bool {
  value = null
  value
}
change(42)`),
    /Cannot assign null to parameter 'value' of function 'change': expected int\|bool\./,
  );
});

test("allows an explicit any parameter to change runtime type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn change(any value) returns any {
  value = null
  value
}
change(42)`),
    {
      type: "Null",
    },
  );
});

test("allows an implicitly any parameter to change runtime type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn change(value) returns any {
  value = true
  value
}
change(42)`),
    {
      type: "Boolean",
      value: true,
    },
  );
});

test("an omitted return type accepts every available runtime type", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn choose(bool condition) {
  if (condition) {
    return 42
  }

  true
}
choose(false)`),
    {
      type: "Boolean",
      value: true,
    },
  );
});

test("does not repeat declaration warnings for repeated calls", () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;

  console.warn = (...values: unknown[]) => {
    warnings.push(values.map(String).join(" "));
  };

  try {
    evaluate(`fn identity(value) {
  value
}
identity(1)
identity(2)
identity(3)`);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 2);
  assert.match(warnings[0]!, /parameter 'value'/);
  assert.match(warnings[1]!, /function 'identity'/);
});

test("keeps untyped Phase 7 functions working", () => {
  assert.deepEqual(
    evaluateWithoutWarnings(`fn add(left, right) {
  left + right
}
add(20, 22)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});
