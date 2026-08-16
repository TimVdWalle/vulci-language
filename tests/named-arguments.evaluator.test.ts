// Phase 9

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { NULL_VALUE, RuntimeValue } from "../src/runtime-value.js";

function evaluate(
  source: string,
  environment = new Environment(),
): RuntimeValue {
  const tokens = new Lexer(source).lex();
  const program = new Parser(tokens).parse();

  return new Evaluator(environment).evaluate(program);
}

test("supports positional required arguments", () => {
  assert.deepEqual(
    evaluate(`fn subtract(left, right) {
  left - right
}

subtract(10, 3)`),
    {
      type: "Integer",
      value: 7,
    },
  );
});

test("supports named required arguments", () => {
  assert.deepEqual(
    evaluate(`fn subtract(left, right) {
  left - right
}

subtract(left: 10, right: 3)`),
    {
      type: "Integer",
      value: 7,
    },
  );
});

test("supports reordered named arguments", () => {
  assert.deepEqual(
    evaluate(`fn subtract(left, right) {
  left - right
}

subtract(right: 3, left: 10)`),
    {
      type: "Integer",
      value: 7,
    },
  );
});

test("supports positional arguments followed by named arguments", () => {
  assert.deepEqual(
    evaluate(`fn calculate(left, right, multiplier=1) {
  (left + right) * multiplier
}

calculate(10, 5, multiplier: 2)`),
    {
      type: "Integer",
      value: 30,
    },
  );
});

test("uses a default when an optional argument is omitted", () => {
  assert.deepEqual(
    evaluate(`fn add(left, right=10) {
  left + right
}

add(5)`),
    {
      type: "Integer",
      value: 15,
    },
  );
});

test("uses a supplied named value instead of the default", () => {
  assert.deepEqual(
    evaluate(`fn add(left, right=10) {
  left + right
}

add(5, right: 20)`),
    {
      type: "Integer",
      value: 25,
    },
  );
});

test("evaluates defaults separately for every omission", () => {
  const environment = new Environment();
  let nextValue = 0;

  environment.define("next", {
    type: "NativeFunction",
    parameters: [],

    call() {
      nextValue += 1;

      return {
        type: "Integer",
        value: nextValue,
      };
    },
  });

  assert.deepEqual(
    evaluate(
      `fn get(value=next()) {
  value
}

get()
get()`,
      environment,
    ),
    {
      type: "Integer",
      value: 2,
    },
  );

  assert.equal(nextValue, 2);
});

test("does not evaluate a default when the argument is supplied", () => {
  const environment = new Environment();
  let calls = 0;

  environment.define("next", {
    type: "NativeFunction",
    parameters: [],

    call() {
      calls += 1;

      return {
        type: "Integer",
        value: calls,
      };
    },
  });

  assert.deepEqual(
    evaluate(
      `fn get(value=next()) {
  value
}

get(value: 42)`,
      environment,
    ),
    {
      type: "Integer",
      value: 42,
    },
  );

  assert.equal(calls, 0);
});

test("allows defaults to read global variables", () => {
  assert.deepEqual(
    evaluate(`$fallback = 40

fn add(value, extra=$fallback) {
  value + extra
}

add(2)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("allows defaults to call functions", () => {
  assert.deepEqual(
    evaluate(`fn fallback() {
  40
}

fn add(value, extra=fallback()) {
  value + extra
}

add(2)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("defaults cannot access another parameter", () => {
  assert.throws(
    () =>
      evaluate(`fn copy(source, result=source) {
  result
}

copy(42)`),
    /Undefined variable 'source'\./,
  );
});

test("defaults cannot access caller-local variables", () => {
  assert.throws(
    () =>
      evaluate(`fn read(value=localValue) {
  value
}

fn caller() {
  localValue = 42
  read()
}

caller()`),
    /Undefined variable 'localValue'\./,
  );
});

test("validates the runtime type of a default value", () => {
  assert.throws(
    () =>
      evaluate(`fn choose(bool value=1) {
  value
}

choose()`),
    /expects bool|expected bool/i,
  );
});

test("reports an unknown named argument", () => {
  assert.throws(
    () =>
      evaluate(`fn identity(value) {
  value
}

identity(other: 42)`),
    /Function 'identity' has no parameter named 'other'\./,
  );
});

test("reports duplicate positional and named binding", () => {
  assert.throws(
    () =>
      evaluate(`fn add(left, right) {
  left + right
}

add(1, left: 2, right: 3)`),
    /Argument 'left' is supplied more than once to function 'add'\./,
  );
});

test("reports a missing required named argument", () => {
  assert.throws(
    () =>
      evaluate(`fn add(left, right) {
  left + right
}

add(right: 2)`),
    /Function 'add' is missing required argument 'left'\./,
  );
});

test("requires optional arguments to be named", () => {
  assert.throws(
    () =>
      evaluate(`fn calculate(left, right=10) {
  left + right
}

calculate(1, 2)`),
    /Optional argument 'right' of function 'calculate' must be named\./,
  );
});

test("allows at most two positional arguments", () => {
  assert.throws(
    () =>
      evaluate(`fn calculate(first, second, third) {
  first + second + third
}

calculate(1, 2, 3)`),
    /Function 'calculate' accepts at most two positional arguments\./,
  );
});

test("supports named arguments for native functions", () => {
  const environment = new Environment();
  let captured: RuntimeValue = NULL_VALUE;

  environment.define("print", {
    type: "NativeFunction",
    parameters: [
      {
        name: "value",
        required: true,
      },
    ],

    call(arguments_) {
      captured = arguments_[0] ?? NULL_VALUE;

      return NULL_VALUE;
    },
  });

  assert.deepEqual(evaluate("print(value: 42)", environment), NULL_VALUE);

  assert.deepEqual(captured, {
    type: "Integer",
    value: 42,
  });
});

test("reports incomplete native-function parameter metadata", () => {
  const environment = new Environment();
  environment.define("legacy", {
    type: "NativeFunction",
    call: () => NULL_VALUE,
  });
  assert.throws(
    () => evaluate("legacy(value: 1)", environment),
    /does not declare named parameters/,
  );
  environment.define("optional", {
    type: "NativeFunction",
    parameters: [{ name: "value", required: false }],
    call: () => NULL_VALUE,
  });
  assert.throws(
    () => evaluate("optional()", environment),
    /has no value for parameter 'value'/,
  );
});

test("reports incomplete user-function default metadata", () => {
  const program = new Parser(
    new Lexer(`fn identity(value = 1) { value }
identity()`).lex(),
  ).parse();
  const declaration = program.statements[0];
  assert.equal(declaration?.type, "ExpressionStatement");
  assert.equal(declaration.expression.type, "FunctionDeclaration");
  if (declaration.expression.type !== "FunctionDeclaration") assert.fail();
  declaration.expression.parameterDefaults = [];
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(program),
    /Function 'identity' is missing required argument 'value'/,
  );
});

test("supports bare zero-argument function calls", () => {
  assert.deepEqual(
    evaluate(`fn answer() {
  42
}

answer`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("bare local variables still evaluate as variables", () => {
  assert.deepEqual(
    evaluate(`fn read() returns int {
  answer = 42
  answer
}
read()`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("supports a trailing comma in a function call", () => {
  assert.deepEqual(
    evaluate(`fn add(left, right) {
  left + right
}

add(
  20,
  right: 22,
)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});
