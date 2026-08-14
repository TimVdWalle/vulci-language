// Phase 15B

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { TokenType } from "../src/token.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

test("parses a null literal", () => {
  const program = parse("null");

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "NullLiteral",
    },
  });
});

test("parses an if expression without else", () => {
  const program = parse(`if (true) {
  1
}`);

  assert.deepEqual(program.statements[0], {
    type: "ExpressionStatement",
    expression: {
      type: "ConditionalExpression",
      branches: [
        {
          keyword: {
            type: TokenType.If,
            lexeme: "if",
            line: 1,
            column: 1,
          },
          condition: {
            type: "BooleanLiteral",
            value: true,
          },
          expressions: [
            {
              type: "IntegerLiteral",
              value: 1,
            },
          ],
        },
      ],
      elseKeyword: null,
      elseExpressions: null,
    },
  });
});

test("parses an if else expression", () => {
  const program = parse(`if (true) {
  1
} else {
  2
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");

  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }

  assert.equal(statement.expression.type, "ConditionalExpression");

  if (statement.expression.type !== "ConditionalExpression") {
    assert.fail("Expected a conditional expression.");
  }

  assert.equal(statement.expression.branches.length, 1);

  assert.deepEqual(statement.expression.elseExpressions, [
    {
      type: "IntegerLiteral",
      value: 2,
    },
  ]);
});

test("parses else if branches in source order", () => {
  const program = parse(`if (false) {
  1
} else if (true) {
  2
} else if (false) {
  3
} else {
  4
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");

  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }

  assert.equal(statement.expression.type, "ConditionalExpression");

  if (statement.expression.type !== "ConditionalExpression") {
    assert.fail("Expected a conditional expression.");
  }

  assert.equal(statement.expression.branches.length, 3);

  assert.deepEqual(
    statement.expression.branches.map((branch) => branch.keyword.type),
    [TokenType.If, TokenType.If, TokenType.If],
  );

  assert.deepEqual(
    statement.expression.branches.map((branch) => branch.condition),
    [
      {
        type: "BooleanLiteral",
        value: false,
      },
      {
        type: "BooleanLiteral",
        value: true,
      },
      {
        type: "BooleanLiteral",
        value: false,
      },
    ],
  );

  assert.deepEqual(statement.expression.elseExpressions, [
    {
      type: "IntegerLiteral",
      value: 4,
    },
  ]);
});

test("parses multiple expressions inside a branch", () => {
  const program = parse(`if (true) {
  value = 10
  value + 1
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");

  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }

  assert.equal(statement.expression.type, "ConditionalExpression");

  if (statement.expression.type !== "ConditionalExpression") {
    assert.fail("Expected a conditional expression.");
  }

  const branch = statement.expression.branches[0];

  assert.ok(branch);
  assert.equal(branch.expressions.length, 2);

  assert.deepEqual(branch.expressions[0], {
    type: "AssignmentExpression",
    name: "value",
    value: {
      type: "IntegerLiteral",
      value: 10,
    },
  });

  assert.deepEqual(branch.expressions[1], {
    type: "BinaryExpression",
    left: {
      type: "VariableReference",
      name: "value",
      token: {
        type: TokenType.Identifier,
        lexeme: "value",
        line: 3,
        column: 3,
      },
    },
    operator: {
      type: TokenType.Plus,
      lexeme: "+",
      line: 3,
      column: 9,
    },
    right: {
      type: "IntegerLiteral",
      value: 1,
    },
  });
});

test("parses a conditional expression inside an assignment", () => {
  const program = parse(`result = if (true) {
  1
} else {
  2
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");

  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }

  assert.equal(statement.expression.type, "AssignmentExpression");

  if (statement.expression.type !== "AssignmentExpression") {
    assert.fail("Expected an assignment expression.");
  }

  assert.equal(statement.expression.value.type, "ConditionalExpression");
});

test("parses a nested conditional expression", () => {
  const program = parse(`if (true) {
  if (false) {
    1
  } else {
    2
  }
}`);

  const statement = program.statements[0];

  assert.equal(statement?.type, "ExpressionStatement");

  if (statement?.type !== "ExpressionStatement") {
    assert.fail("Expected an expression statement.");
  }

  assert.equal(statement.expression.type, "ConditionalExpression");

  if (statement.expression.type !== "ConditionalExpression") {
    assert.fail("Expected a conditional expression.");
  }

  assert.equal(
    statement.expression.branches[0]?.expressions[0]?.type,
    "ConditionalExpression",
  );
});

test("requires parentheses around an if condition", () => {
  assert.throws(
    () =>
      parse(`if true {
  1
}`),
    /Expected '\(' after 'if'\. at 1:4/,
  );
});

test("requires parentheses around an else if condition", () => {
  assert.throws(
    () =>
      parse(`if (false) {
  1
} else if true {
  2
}`),
    /Expected '\(' after 'if'\. at 3:11/,
  );
});

test("rejects a missing condition", () => {
  assert.throws(
    () =>
      parse(`if () {
  1
}`),
    /Expected expression\. at 1:5/,
  );
});

test("rejects a missing closing condition parenthesis", () => {
  assert.throws(
    () =>
      parse(`if (true {
  1
}`),
    /Expected '\)' after condition\. at 1:10/,
  );
});

test("requires an opening brace for a branch", () => {
  assert.throws(
    () =>
      parse(`if (true)
  1`),
    /Expected '\{' before branch body\./,
  );
});

test("requires a closing brace for a branch", () => {
  assert.throws(
    () =>
      parse(`if (true) {
  1`),
    /Expected '\}' after branch body\./,
  );
});

test("rejects an empty if branch", () => {
  assert.throws(
    () =>
      parse(`if (true) {
}`),
    /Conditional branches cannot be empty\./,
  );
});

test("rejects an empty else if branch", () => {
  assert.throws(
    () =>
      parse(`if (false) {
  1
} else if (true) {
} else {
  3
}`),
    /Conditional branches cannot be empty\./,
  );
});

test("rejects an empty else branch", () => {
  assert.throws(
    () =>
      parse(`if (false) {
  1
} else {
}`),
    /Conditional branches cannot be empty\./,
  );
});

test("does not consume the statement-ending newline when else is absent", () => {
  const program = parse(`result = if (false) {
  1
}

print(result)
`);

  assert.equal(program.statements.length, 2);
});

test("accepts a return as the final conditional-branch expression", () => {
  assert.doesNotThrow(() =>
    parse(`if (true) {
  return 1

}`),
  );
});

test("rejects an expression after a conditional-branch return", () => {
  assert.throws(
    () =>
      parse(`if (true) {
  return 1
  2
}`),
    /Unreachable expression after unconditional return/,
  );
});
