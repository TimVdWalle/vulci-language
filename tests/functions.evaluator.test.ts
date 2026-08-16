// Phase 9

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";

function evaluate(
  source: string,
  environment = new Environment(),
): RuntimeValue {
  const tokens = new Lexer(source).lex();
  const program = new Parser(tokens).parse();

  return new Evaluator(environment).evaluate(program);
}

function native(call: () => RuntimeValue) {
  return { type: "NativeFunction" as const, parameters: [], call };
}

test("calls a function with arguments", () => {
  assert.deepEqual(
    evaluate(`fn add(left, right) {
  return left + right
}
add(20, 22)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("calls a function without arguments", () => {
  assert.deepEqual(
    evaluate(`fn answer() {
  return 42
}
answer()`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("uses the final expression as the function result", () => {
  assert.deepEqual(
    evaluate(`fn add(left, right) {
  left + right
}
add(20, 22)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("return without a value returns null", () => {
  assert.deepEqual(
    evaluate(`fn stop() {
  return
}
stop()`),
    {
      type: "Null",
    },
  );
});

test("return immediately exits the function", () => {
  assert.deepEqual(
    evaluate(`fn choose(value) {
  if (value == 1) {
    return 10
  }
  20
}
choose(1)`),
    {
      type: "Integer",
      value: 10,
    },
  );
});

test("evaluates function arguments before entering the function", () => {
  assert.deepEqual(
    evaluate(`fn identity(value) {
  return value
}
identity(20 + 22)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("evaluates function arguments from left to right", () => {
  const environment = new Environment();
  let nextValue = 0;

  environment.define("next", {
    type: "NativeFunction",

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
      `fn combine(left, right) {
  return left * 10 + right
}
combine(next(), next())`,
      environment,
    ),
    {
      type: "Integer",
      value: 12,
    },
  );
});

test("function parameters are local variables", () => {
  assert.throws(
    () =>
      evaluate(`fn identity(value) {
  return value
}
identity(42)
value`),
    /Undefined variable 'value'\./,
  );
});

test("assignments inside functions remain local", () => {
  assert.throws(
    () =>
      evaluate(`fn calculate() {
  localValue = 42
  return localValue
}
calculate()
localValue`),
    /Undefined variable 'localValue'\./,
  );
});

test("local variables can shadow similarly named globals", () => {
  assert.deepEqual(
    evaluate(`$value = 10
fn change() {
  value = 20
  return value
}
change()
$value`),
    {
      type: "Integer",
      value: 10,
    },
  );
});

test("separate function calls use separate local environments", () => {
  assert.deepEqual(
    evaluate(`fn identity(value) {
  localValue = value
  return localValue
}
identity(1)
identity(42)`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("reads a declared global variable inside a function", () => {
  assert.deepEqual(
    evaluate(`$value = 42
fn readGlobal() {
  return $value
}
readGlobal()`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("updates a declared global variable inside a function", () => {
  assert.deepEqual(
    evaluate(`$counter = 0
fn increment() {
  $counter = $counter + 1
  return $counter
}
increment()
increment()
$counter`),
    {
      type: "Integer",
      value: 2,
    },
  );
});

test("rejects assigning an undeclared global inside a function", () => {
  assert.throws(
    () =>
      evaluate(`fn createGlobal() {
  $value = 42
}
createGlobal()`),
    /Global variable '\$value' must be declared at the top level before it can be assigned inside a function\./,
  );
});

test("functions can call native functions", () => {
  const environment = new Environment();
  let captured: RuntimeValue[] = [];

  environment.define("capture", {
    type: "NativeFunction",

    call(arguments_) {
      captured = arguments_;

      return {
        type: "Null",
      };
    },
  });

  evaluate(
    `fn send(value) {
  capture(value)
}
send(42)`,
    environment,
  );

  assert.deepEqual(captured, [
    {
      type: "Integer",
      value: 42,
    },
  ]);
});

test("handles native-function edge paths inside user functions", () => {
  const environment = new Environment();
  const answer = native(() => ({ type: "Integer", value: 42 }));
  const provider = native(() => answer);
  environment.define("answer", answer);
  environment.define("provide", provider);
  assert.deepEqual(
    evaluate(
      "fn read() returns int { direct = answer\nlocal = provide()\nlocal()\ndirect + local }\nread()",
      environment,
    ),
    { type: "Integer", value: 84 },
  );

  const explode = native(() => {
    throw new RangeError("host recursion");
  });
  environment.define("explode", explode);
  const recursiveSource = "fn wrapper() returns null { explode() }\nwrapper()";
  assert.throws(
    () => evaluate(recursiveSource, environment),
    /Maximum function call depth exceeded while calling 'wrapper'/,
  );

  const metadata = { name: "value", required: false };
  const parameters = [metadata];
  let reads = 0;
  Object.defineProperty(parameters, 0, {
    get: () => (++reads === 4 ? undefined : metadata),
  });
  environment.define("incomplete", {
    type: "NativeFunction",
    parameters,
    call: () => ({ type: "Null" }),
  });
  assert.throws(
    () => evaluate("incomplete()", environment),
    /has no value for parameter '0'/,
  );
});

test("rejects a function name that collides with a native function", () => {
  const environment = new Environment();

  environment.define("capture", {
    type: "NativeFunction",

    call() {
      return {
        type: "Null",
      };
    },
  });

  assert.throws(
    () =>
      evaluate(
        `fn capture(value) {
  return value
}`,
        environment,
      ),
    /Name 'capture' is already defined\. at 1:4/,
  );
});

test("function declarations evaluate to null", () => {
  assert.deepEqual(
    evaluate(`fn answer() {
  return 42
}`),
    {
      type: "Null",
    },
  );
});

test("supports calling a function declared later in the file", () => {
  assert.deepEqual(
    evaluate(`$result = first()
fn first() {
  return 42
}
$result`),
    {
      type: "Integer",
      value: 42,
    },
  );
});

test("supports direct recursion", () => {
  assert.deepEqual(
    evaluate(`fn factorial(value) {
  if (value == 0) {
    return 1
  }
  return value * factorial(value - 1)
}
factorial(5)`),
    {
      type: "Integer",
      value: 120,
    },
  );
});

test("supports mutual recursion", () => {
  assert.deepEqual(
    evaluate(`fn isEven(value) {
  if (value == 0) {
    return true
  }
  return isOdd(value - 1)
}
fn isOdd(value) {
  if (value == 0) {
    return false
  }
  return isEven(value - 1)
}
isEven(10)`),
    {
      type: "Boolean",
      value: true,
    },
  );
});

test("reports an undefined function", () => {
  assert.throws(
    () => evaluate("missing()"),
    /Undefined function 'missing'\. at 1:1/,
  );
});

test("reports a global value that is not a function", () => {
  assert.throws(
    () =>
      evaluate(`$value = 42
$value()`),
    /Cannot call '\$value': value is not a function\./,
  );
});

test("reports a local value that is not a function", () => {
  assert.throws(
    () =>
      evaluate(`fn run(value) {
  value()
}
run(42)`),
    /Cannot call 'value': value is not a function\./,
  );
});

test("reports too few arguments", () => {
  assert.throws(
    () =>
      evaluate(`fn add(left, right) {
  return left + right
}
add(1)`),
    /Function 'add' is missing required argument 'right'\./,
  );
});

test("reports too many arguments", () => {
  assert.throws(
    () =>
      evaluate(`fn identity(value) {
  return value
}
identity(1, 2)`),
    /Function 'identity' received too many positional arguments\./,
  );
});

test("rejects duplicate function names", () => {
  assert.throws(
    () =>
      evaluate(`fn answer() {
  return 42
}
fn answer() {
  return 43
}`),
    /Function 'answer' is already defined\./,
  );
});

test("rejects assigning a top-level value to a function name", () => {
  assert.throws(
    () =>
      evaluate(`fn answer() {
  return 42
}
answer = 43`),
    /Name 'answer' is already defined as a function\./,
  );
});

test("rejects return outside a function", () => {
  assert.throws(
    () => evaluate("return 42"),
    /'return' can only be used inside a function\./,
  );
});

test("reports excessive recursion as a Vulci runtime error", () => {
  assert.throws(
    () =>
      evaluate(`fn loop() {
  loop()
}
loop()`),
    /Maximum function call depth exceeded while calling 'loop'\. at 2:3/,
  );
});

test("does not leak the host stack-overflow diagnostic", () => {
  let thrown: unknown;

  try {
    evaluate(`fn loop() {
  loop()
}
loop()`);
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof Error);

  assert.match(
    thrown.message,
    /Maximum function call depth exceeded while calling 'loop'\./,
  );

  assert.doesNotMatch(thrown.message, /RangeError/);
  assert.doesNotMatch(thrown.message, /Maximum call stack size exceeded/);
});
