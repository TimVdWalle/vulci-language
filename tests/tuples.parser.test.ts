// Phase 11

import assert from "node:assert/strict";
import test from "node:test";
import { FunctionDeclaration } from "../src/ast.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

function expression(source: string) {
  return parse(source).statements[0]!.expression;
}

function declaration(source: string): FunctionDeclaration {
  const node = expression(source);
  assert.equal(node.type, "FunctionDeclaration");
  return node as FunctionDeclaration;
}

test("parses tuple literals and preserves grouping", () => {
  assert.deepEqual(expression("(1, 2,)"), {
    type: "TupleLiteral",
    members: [
      { type: "IntegerLiteral", value: 1 },
      { type: "IntegerLiteral", value: 2 },
    ],
  });
  const grouped = expression("(1 + 2)");
  assert.equal(grouped.type, "BinaryExpression");
  if (grouped.type !== "BinaryExpression") assert.fail("Expected addition.");
  assert.equal(grouped.operator.lexeme, "+");
});

test("parses postfix indexing", () => {
  const node = expression("(10, 20)[1 + 0]");
  assert.equal(node.type, "IndexExpression");
  if (node.type !== "IndexExpression") assert.fail("Expected indexing.");
  assert.equal(node.target.type, "TupleLiteral");
  assert.equal(node.index.type, "BinaryExpression");
});

test("parses nested tuple annotations and unions", () => {
  const node =
    declaration(`fn swap(tuple(tuple(int, int), str|null) value) returns tuple(str, int)|null {
  null
}`);
  assert.equal(node.parameterTypes?.[0]?.members[0]?.type, "TupleType");
  assert.deepEqual(
    node.returnType?.members.map((member) => member.lexeme),
    ["tuple", "null"],
  );
});

test("rejects empty and one-member tuples", () => {
  assert.throws(() => parse("()"), /Expected expression inside parentheses/);
  assert.throws(() => parse("(1,)"), /at least two members/);
});

test("rejects malformed tuple literals", () => {
  assert.throws(() => parse("(1,, 2)"), /Expected tuple member before ','/);
  assert.throws(() => parse("(1, 2"), /Expected '\)' after tuple literal/);
});

test("rejects invalid tuple types", () => {
  assert.throws(
    () => declaration("fn use(tuple(, int) value) returns int { 1\n}"),
    /Expected a tuple member type before ','/,
  );
  assert.throws(
    () => declaration("fn use(tuple() value) returns int { 1\n}"),
    /at least two member types/,
  );
  assert.throws(
    () => declaration("fn use(tuple(int,) value) returns int { 1\n}"),
    /at least two member types/,
  );
  assert.throws(
    () => declaration("fn use(tuple value) returns int { 1\n}"),
    /bare 'tuple' type/,
  );
});
