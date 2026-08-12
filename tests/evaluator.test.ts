// Phase 15

import assert from "node:assert/strict";
import test from "node:test";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";
function evaluate(source: string, environment: Environment): RuntimeValue {
  const tokens = new Lexer(source).lex();
  const program = new Parser(tokens).parse();
  const evaluator = new Evaluator(environment);
  return evaluator.evaluate(program);
}
test("stores and retrieves variables", () => {
  const environment = new Environment();
  evaluate("$answer = 42", environment);
  assert.deepEqual(environment.get("$answer"), {
    type: "Integer",
    value: 42,
  });
});
test("calls native functions with evaluated arguments", () => {
  const environment = new Environment();
  let receivedArguments: unknown;
  environment.define("capture", {
    type: "NativeFunction",
    call(arguments_) {
      receivedArguments = arguments_;
      return {
        type: "Null",
      };
    },
  });
  evaluate(
    `$answer = 42
capture($answer)
`,
    environment,
  );
  assert.deepEqual(receivedArguments, [
    {
      type: "Integer",
      value: 42,
    },
  ]);
});
test("reports undefined variables", () => {
  const environment = new Environment();
  assert.throws(
    () => evaluate("print(answer)", environment),
    /Undefined function 'print'/,
  );
});
test("reports values that are not callable", () => {
  const environment = new Environment();
  assert.throws(
    () =>
      evaluate(
        `$answer = 42
$answer()
`,
        environment,
      ),
    /Cannot call '\$answer': value is not a function/,
  );
});
test("evaluates addition", () => {
  const result = evaluate("1 + 2", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 3,
  });
});
test("evaluates subtraction", () => {
  const result = evaluate("10 - 3", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 7,
  });
});
test("evaluates multiplication", () => {
  const result = evaluate("6 * 7", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 42,
  });
});
test("evaluates integer division", () => {
  const result = evaluate("20 / 4", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 5,
  });
});
test("truncates positive division toward zero", () => {
  const result = evaluate("25 / 4", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 6,
  });
});
test("truncates negative division toward zero", () => {
  const result = evaluate("-25 / 4", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: -6,
  });
});
test("evaluates remainder", () => {
  const result = evaluate("25 % 4", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 1,
  });
});
test("preserves a negative dividend for remainder", () => {
  const result = evaluate("-25 % 4", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: -1,
  });
});
test("evaluates unary negation", () => {
  const result = evaluate("-42", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: -42,
  });
});
test("evaluates parenthesized repeated negation", () => {
  const result = evaluate("-(-5)", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 5,
  });
});
test("respects multiplication precedence", () => {
  const result = evaluate("1 + 2 * 3", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 7,
  });
});
test("respects parentheses", () => {
  const result = evaluate("(1 + 2) * 3", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 9,
  });
});
test("evaluates addition and subtraction left-associatively", () => {
  const result = evaluate("10 - 3 + 2", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 9,
  });
});
test("evaluates division left-associatively", () => {
  const result = evaluate("20 / 5 / 2", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 2,
  });
});
test("evaluates expressions containing variables", () => {
  const environment = new Environment();
  const result = evaluate(
    `$value = 10
$value + 3 * 4
`,
    environment,
  );
  assert.deepEqual(result, {
    type: "Integer",
    value: 22,
  });
});
test("evaluates integers containing separators", () => {
  const result = evaluate("1_000_000 + 2_000", new Environment());
  assert.deepEqual(result, {
    type: "Integer",
    value: 1_002_000,
  });
});
test("reports division by zero at the operator", () => {
  assert.throws(
    () => evaluate("10 / 0", new Environment()),
    /Division by zero at 1:4/,
  );
});
test("reports remainder by zero at the operator", () => {
  assert.throws(
    () => evaluate("10 % 0", new Environment()),
    /Remainder by zero at 1:4/,
  );
});
test("reports addition overflow at the operator", () => {
  assert.throws(
    () => evaluate("9_007_199_254_740_991 + 1", new Environment()),
    /Integer arithmetic result is outside the supported range at 1:23/,
  );
});
test("reports subtraction overflow at the operator", () => {
  assert.throws(
    () => evaluate("-9_007_199_254_740_991 - 1", new Environment()),
    /Integer arithmetic result is outside the supported range at 1:24/,
  );
});
test("reports multiplication overflow at the operator", () => {
  assert.throws(
    () => evaluate("9_007_199_254_740_991 * 2", new Environment()),
    /Integer arithmetic result is outside the supported range at 1:23/,
  );
});
test("reports intermediate-result overflow immediately", () => {
  assert.throws(
    () => evaluate("(9_007_199_254_740_991 + 1) - 1", new Environment()),
    /Integer arithmetic result is outside the supported range at 1:24/,
  );
});
test("evaluates true", () => {
  const result = evaluate("true", new Environment());
  assert.deepEqual(result, {
    type: "Boolean",
    value: true,
  });
});
test("evaluates false", () => {
  const result = evaluate("false", new Environment());
  assert.deepEqual(result, {
    type: "Boolean",
    value: false,
  });
});
test("stores and retrieves Boolean values", () => {
  const environment = new Environment();
  evaluate("$result = true", environment);
  assert.deepEqual(environment.get("$result"), {
    type: "Boolean",
    value: true,
  });
});
test("evaluates integer equality", () => {
  assert.deepEqual(evaluate("1 == 1", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("1 == 2", new Environment()), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("1 != 2", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("1 != 1", new Environment()), {
    type: "Boolean",
    value: false,
  });
});
test("evaluates Boolean equality", () => {
  assert.deepEqual(evaluate("true == true", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("true == false", new Environment()), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("true != false", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("false != false", new Environment()), {
    type: "Boolean",
    value: false,
  });
});
test("compares operands with different runtime types as unequal", () => {
  assert.deepEqual(evaluate("1 == true", new Environment()), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("false != 0", new Environment()), {
    type: "Boolean",
    value: true,
  });
});
test("evaluates ordering comparisons", () => {
  const cases: Array<[string, boolean]> = [
    ["1 < 2", true],
    ["2 < 1", false],
    ["2 <= 2", true],
    ["3 <= 2", false],
    ["3 > 2", true],
    ["2 > 3", false],
    ["3 >= 3", true],
    ["2 >= 3", false],
  ];
  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source, new Environment()), {
      type: "Boolean",
      value: expected,
    });
  }
});
test("rejects non-integer ordering operands", () => {
  assert.throws(
    () => evaluate("true < false", new Environment()),
    /Operator '<' requires two integers or two strings\. at 1:6/,
  );
  assert.throws(
    () => evaluate("1 >= false", new Environment()),
    /Operator '>=' requires two integers or two strings\. at 1:3/,
  );
});
test("evaluates arithmetic before comparisons", () => {
  assert.deepEqual(evaluate("1 + 2 == 3", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("2 * 3 > 5", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("10 - 4 <= 2 * 3", new Environment()), {
    type: "Boolean",
    value: true,
  });
});
test("evaluates parenthesized comparisons", () => {
  assert.deepEqual(evaluate("(1 < 2) == true", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("(2 > 3) == false", new Environment()), {
    type: "Boolean",
    value: true,
  });
});
test("evaluates not", () => {
  assert.deepEqual(evaluate("not true", new Environment()), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("not false", new Environment()), {
    type: "Boolean",
    value: true,
  });
});
test("evaluates repeated not operators", () => {
  assert.deepEqual(evaluate("not not true", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("not not false", new Environment()), {
    type: "Boolean",
    value: false,
  });
});
test("evaluates all and truth-table cases", () => {
  const cases: Array<[string, boolean]> = [
    ["true and true", true],
    ["true and false", false],
    ["false and true", false],
    ["false and false", false],
  ];
  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source, new Environment()), {
      type: "Boolean",
      value: expected,
    });
  }
});
test("evaluates all or truth-table cases", () => {
  const cases: Array<[string, boolean]> = [
    ["true or true", true],
    ["true or false", true],
    ["false or true", true],
    ["false or false", false],
  ];
  for (const [source, expected] of cases) {
    assert.deepEqual(evaluate(source, new Environment()), {
      type: "Boolean",
      value: expected,
    });
  }
});
test("evaluates logical operator precedence", () => {
  assert.deepEqual(evaluate("not 1 < 2", new Environment()), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("not false and true", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("true or false and false", new Environment()), {
    type: "Boolean",
    value: true,
  });
  assert.deepEqual(evaluate("(true or false) and false", new Environment()), {
    type: "Boolean",
    value: false,
  });
});
test("short-circuits and without evaluating the right operand", () => {
  assert.deepEqual(evaluate("false and missing", new Environment()), {
    type: "Boolean",
    value: false,
  });
});
test("short-circuits or without evaluating the right operand", () => {
  assert.deepEqual(evaluate("true or missing", new Environment()), {
    type: "Boolean",
    value: true,
  });
});
test("does not type-check skipped logical operands", () => {
  assert.deepEqual(evaluate("false and 1", new Environment()), {
    type: "Boolean",
    value: false,
  });
  assert.deepEqual(evaluate("true or 1", new Environment()), {
    type: "Boolean",
    value: true,
  });
});
test("evaluates required right logical operands", () => {
  assert.throws(
    () => evaluate("true and missing", new Environment()),
    /Undefined variable 'missing'/,
  );
  assert.throws(
    () => evaluate("false or missing", new Environment()),
    /Undefined variable 'missing'/,
  );
});
test("rejects a non-Boolean not operand", () => {
  assert.throws(
    () => evaluate("not 1", new Environment()),
    /Operator 'not' requires a boolean operand, but the operand is integer\. at 1:1/,
  );
});
test("rejects a non-Boolean left operand for and", () => {
  assert.throws(
    () => evaluate("1 and true", new Environment()),
    /Operator 'and' requires boolean operands, but the left operand is integer\. at 1:3/,
  );
});
test("rejects a non-Boolean right operand for and", () => {
  assert.throws(
    () => evaluate("true and 1", new Environment()),
    /Operator 'and' requires boolean operands, but the right operand is integer\. at 1:6/,
  );
});
test("rejects a non-Boolean left operand for or", () => {
  assert.throws(
    () => evaluate("1 or false", new Environment()),
    /Operator 'or' requires boolean operands, but the left operand is integer\. at 1:3/,
  );
});
test("rejects a non-Boolean right operand for or", () => {
  assert.throws(
    () => evaluate("false or 1", new Environment()),
    /Operator 'or' requires boolean operands, but the right operand is integer\. at 1:7/,
  );
});
test("reports logical errors at the operator source position", () => {
  assert.throws(
    () =>
      evaluate(
        `$value = true
$value and 1
`,
        new Environment(),
      ),
    /Operator 'and' requires boolean operands, but the right operand is integer\. at 2:8/,
  );
  assert.throws(
    () =>
      evaluate(
        `$value = false
$value or 1
`,
        new Environment(),
      ),
    /Operator 'or' requires boolean operands, but the right operand is integer\. at 2:8/,
  );
  assert.throws(
    () =>
      evaluate(
        `$value = 1
not $value
`,
        new Environment(),
      ),
    /Operator 'not' requires a boolean operand, but the operand is integer\. at 2:1/,
  );
});
