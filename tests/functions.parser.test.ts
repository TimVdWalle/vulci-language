// Phase 9

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { TokenType } from "../src/token.js";

class ParserStateProbe extends Parser {
  public nextToken() {
    return this.peek();
  }
}

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

test("parses a function declaration", () => {
  const program = parse(`fn add(left, right) {
  return left + right
}`);

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "FunctionDeclaration",
      keyword: {
        type: TokenType.Fn,
        lexeme: "fn",
        line: 1,
        column: 1,
      },
      name: {
        type: TokenType.Identifier,
        lexeme: "add",
        line: 1,
        column: 4,
      },
      parameters: [
        {
          type: TokenType.Identifier,
          lexeme: "left",
          line: 1,
          column: 8,
        },
        {
          type: TokenType.Identifier,
          lexeme: "right",
          line: 1,
          column: 14,
        },
      ],
      parameterDefaults: [null, null],
      expressions: [
        {
          type: "ReturnExpression",
          keyword: {
            type: TokenType.Return,
            lexeme: "return",
            line: 2,
            column: 3,
          },
          value: {
            type: "BinaryExpression",
            left: {
              type: "VariableReference",
              name: "left",
              token: {
                type: TokenType.Identifier,
                lexeme: "left",
                line: 2,
                column: 10,
              },
            },
            operator: {
              type: TokenType.Plus,
              lexeme: "+",
              line: 2,
              column: 15,
            },
            right: {
              type: "VariableReference",
              name: "right",
              token: {
                type: TokenType.Identifier,
                lexeme: "right",
                line: 2,
                column: 17,
              },
            },
          },
        },
      ],
    },
  });
});

test("parses a function declaration without parameters", () => {
  const program = parse(`fn answer() {
  return 42
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "FunctionDeclaration");

  if (statement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.equal(statement.expression.name.lexeme, "answer");
  assert.deepEqual(statement.expression.parameters, []);
  assert.deepEqual(statement.expression.parameterDefaults, []);
  assert.equal(statement.expression.expressions.length, 1);
});

test("parses multiple expressions inside a function body", () => {
  const program = parse(`fn calculate(value) {
  doubled = value * 2
  return doubled + 1
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "FunctionDeclaration");

  if (statement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(
    statement.expression.expressions.map((expression) => expression.type),
    ["AssignmentExpression", "ReturnExpression"],
  );
});

test("parses return without a value", () => {
  const program = parse(`fn stop() {
  return
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "FunctionDeclaration");

  if (statement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(statement.expression.expressions[0], {
    type: "ReturnExpression",
    keyword: {
      type: TokenType.Return,
      lexeme: "return",
      line: 2,
      column: 3,
    },
    value: null,
  });
});

test("parses a function call with its callee token", () => {
  const program = parse("add(1, 2)");

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "FunctionCall",
      callee: "add",
      calleeToken: {
        type: TokenType.Identifier,
        lexeme: "add",
        line: 1,
        column: 1,
      },
      arguments: [
        {
          type: "IntegerLiteral",
          value: 1,
        },
        {
          type: "IntegerLiteral",
          value: 2,
        },
      ],
      argumentNames: [null, null],
    },
  });
});

test("parses a zero-argument function call with parentheses", () => {
  const program = parse("answer()");

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "FunctionCall",
      callee: "answer",
      calleeToken: {
        type: TokenType.Identifier,
        lexeme: "answer",
        line: 1,
        column: 1,
      },
      arguments: [],
      argumentNames: [],
    },
  });
});

test("parses a recursive function call", () => {
  const program = parse(`fn countdown(value) {
  if (value == 0) {
    return 0
  }
  return countdown(value - 1)
}`);

  const declarationStatement = program.statements[0];

  assert.equal(declarationStatement?.type, "ExpressionStatement");
  assert.equal(declarationStatement.expression.type, "FunctionDeclaration");

  if (declarationStatement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  const returnExpression = declarationStatement.expression.expressions[1];

  assert.equal(returnExpression?.type, "ReturnExpression");

  if (returnExpression?.type !== "ReturnExpression") {
    assert.fail("Expected a return expression.");
  }

  assert.equal(returnExpression.value?.type, "FunctionCall");

  if (returnExpression.value?.type !== "FunctionCall") {
    assert.fail("Expected a recursive function call.");
  }

  assert.equal(returnExpression.value.callee, "countdown");
  assert.equal(returnExpression.value.arguments.length, 1);
  assert.deepEqual(returnExpression.value.argumentNames, [null]);
});

test("parses global variable access inside a function", () => {
  const program = parse(`fn increment() {
  $counter = $counter + 1
  return $counter
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "FunctionDeclaration");

  if (statement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(statement.expression.expressions[0], {
    type: "AssignmentExpression",
    name: "$counter",
    value: {
      type: "BinaryExpression",
      left: {
        type: "VariableReference",
        name: "$counter",
        token: {
          type: TokenType.Identifier,
          lexeme: "$counter",
          line: 2,
          column: 14,
        },
      },
      operator: {
        type: TokenType.Plus,
        lexeme: "+",
        line: 2,
        column: 23,
      },
      right: {
        type: "IntegerLiteral",
        value: 1,
      },
    },
  });
});

test("parses parameter defaults", () => {
  const program = parse(`fn calculate(left, right=10) {
  left + right
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "FunctionDeclaration");

  if (statement.expression.type !== "FunctionDeclaration") {
    assert.fail("Expected a function declaration.");
  }

  assert.deepEqual(statement.expression.parameterDefaults, [
    null,
    {
      type: "IntegerLiteral",
      value: 10,
    },
  ]);
});

test("parses named arguments with colons", () => {
  const program = parse("calculate(10, right: 20)");

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "FunctionCall",
      callee: "calculate",
      calleeToken: {
        type: TokenType.Identifier,
        lexeme: "calculate",
        line: 1,
        column: 1,
      },
      arguments: [
        {
          type: "IntegerLiteral",
          value: 10,
        },
        {
          type: "IntegerLiteral",
          value: 20,
        },
      ],
      argumentNames: [
        null,
        {
          type: TokenType.Identifier,
          lexeme: "right",
          line: 1,
          column: 15,
        },
      ],
    },
  });
});

test("parses trailing commas in parameters and arguments", () => {
  const program = parse(`fn add(
  left,
  right,
) {
  left + right
}

add(
  1,
  right: 2,
)`);

  const declarationStatement = program.statements[0];
  const callStatement = program.statements[1];

  assert.equal(declarationStatement?.expression.type, "FunctionDeclaration");
  assert.equal(callStatement?.expression.type, "FunctionCall");

  if (
    declarationStatement?.expression.type !== "FunctionDeclaration" ||
    callStatement?.expression.type !== "FunctionCall"
  ) {
    assert.fail("Expected a function declaration and function call.");
  }

  assert.equal(declarationStatement.expression.parameters.length, 2);
  assert.equal(callStatement.expression.arguments.length, 2);
  assert.equal(callStatement.expression.argumentNames[1]?.lexeme, "right");
});

test("rejects duplicate parameter names", () => {
  assert.throws(
    () =>
      parse(`fn add(value, value) {
  return value
}`),
    /duplicate parameter|already defined/i,
  );
});

test("rejects required parameters after optional parameters", () => {
  assert.throws(
    () =>
      parse(`fn calculate(left=1, right) {
  left + right
}`),
    /Required parameters must appear before optional parameters\./,
  );
});

test("rejects duplicate named arguments", () => {
  assert.throws(
    () => parse("calculate(value: 1, value: 2)"),
    /Duplicate argument 'value'\./,
  );
});

test("rejects positional arguments after named arguments", () => {
  assert.throws(
    () => parse("calculate(left: 1, 2)"),
    /Positional arguments cannot follow named arguments\./,
  );
});

test("rejects assignments inside defaults", () => {
  assert.throws(
    () =>
      parse(`fn calculate(value=other=10) {
  value
}`),
    /Assignments are not allowed in default parameter values\./,
  );
});

test("rejects an empty function body", () => {
  assert.throws(
    () =>
      parse(`fn empty() {
}`),
    /Function bodies cannot be empty\./,
  );
});

test("rejects a function declaration inside a function", () => {
  assert.throws(
    () =>
      parse(`fn outer() {
  fn inner() {
    return 1
  }
  return inner()
}`),
    /Expected expression\./,
  );
});

test("rejects a missing function name", () => {
  assert.throws(
    () =>
      parse(`fn (value) {
  return value
}`),
    /function name|identifier/i,
  );
  assert.throws(
    () => parse("fn $invalid() returns null { null }"),
    /Function names cannot be global identifiers/,
  );
  assert.throws(
    () => parse("fn invalid($value) returns null { null }"),
    /Function parameters cannot be global identifiers/,
  );
});

test("rejects a missing opening parenthesis", () => {
  assert.throws(
    () =>
      parse(`fn add value) {
  return value
}`),
    /'\('|opening parenthesis/i,
  );
});

test("rejects a missing closing parenthesis", () => {
  assert.throws(
    () =>
      parse(`fn add(value {
  return value
}`),
    /'\)'|closing parenthesis/i,
  );
  assert.throws(
    () => parse("fn invalid(,) returns null { null }"),
    /Expected parameter before ','/,
  );
});

test("reports a truncated parser token stream", () => {
  assert.throws(
    () => new ParserStateProbe([]).nextToken(),
    /Parser reached the end of the token stream/,
  );
});

test("rejects a missing function body", () => {
  assert.throws(() => parse("fn add(value)"), /'\{'|function body/i);
});
