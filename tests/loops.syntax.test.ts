// Phase 18

import assert from "node:assert/strict";
import test from "node:test";
import { Expression } from "../src/ast.js";
import { Lexer } from "../src/lexer.js";
import { TokenType } from "../src/token.js";
import { parseCollectionSource as parse } from "./collection-test-helpers.ts";

function parseExpression(source: string, index = 0): Expression {
  const statement = parse(source).statements[index];
  assert.equal(statement?.type, "ExpressionStatement");
  if (statement?.type !== "ExpressionStatement") assert.fail();
  return statement.expression;
}

test("reserves while and break without reserving contextual loop names", () => {
  const tokens = new Lexer(
    "while break each times continue loop whileValue breakpoint",
  ).lex();

  assert.deepEqual(
    tokens.slice(0, -1).map((token) => token.type),
    [
      TokenType.While,
      TokenType.Break,
      TokenType.Identifier,
      TokenType.Identifier,
      TokenType.Identifier,
      TokenType.Identifier,
      TokenType.Identifier,
      TokenType.Identifier,
    ],
  );
});

test("rejects reserved loop keywords in identifier positions", () => {
  for (const source of [
    "while = true",
    "break = true",
    "fn while() returns null { null }",
    "fn valid(while) returns null { null }",
    "struct while {}",
    "enum break { Ready }",
  ]) {
    assert.throws(() => parse(source));
  }
});

test("parses counted loops, an optional index, and following chains", () => {
  const chained = parseExpression(`3.times(index,) {
  index
}.times() {
}`);

  assert.equal(chained.type, "TimesExpression");
  if (chained.type !== "TimesExpression") assert.fail();
  assert.equal(chained.binding, null);
  assert.equal(chained.receiver.type, "TimesExpression");
  if (chained.receiver.type !== "TimesExpression") assert.fail();
  assert.equal(chained.receiver.binding?.lexeme, "index");
  assert.equal(chained.receiver.expressions[0]?.type, "VariableReference");
  assert.deepEqual(chained.expressions, []);
});

test("uses a following body to disambiguate each and times", () => {
  assert.equal(parseExpression("3.times()").type, "MemberCall");
  assert.equal(parseExpression("value.each(handler)").type, "MemberCall");
  assert.equal(parseExpression("3.times() { }").type, "TimesExpression");
  assert.equal(
    parseExpression(`3.times()
{
}`).type,
    "TimesExpression",
  );
  assert.equal(parseExpression("list[].each(item) { }").type, "EachExpression");
});

test("rejects invalid counted-loop bindings and delimiters", () => {
  for (const source of [
    "3.times(, index) { }",
    "3.times(int index) { }",
    "3.times($index) { }",
    "3.times(index = 1) { }",
    "3.times((index)) { }",
    "3.times(first, second) { }",
    "3.times(index,,) { }",
    "3.times {}",
    "3.times() {",
  ]) {
    assert.throws(() => parse(source));
  }
});

test("parses while as an expression with an empty body", () => {
  const expression = parseExpression("while (false) { }.member");

  assert.equal(expression.type, "MemberAccess");
  if (expression.type !== "MemberAccess") assert.fail();
  assert.equal(expression.receiver.type, "WhileExpression");
  if (expression.receiver.type !== "WhileExpression") assert.fail();
  assert.equal(expression.receiver.condition.type, "BooleanLiteral");
  assert.deepEqual(expression.receiver.expressions, []);
});

test("rejects malformed while forms", () => {
  for (const source of [
    "while true { }",
    "while () { }",
    "while (true { }",
    "while (true)",
    "while (true) {",
  ]) {
    assert.throws(() => parse(source));
  }
});

test("accepts break only in lexically enclosing loop bodies", () => {
  for (const source of [
    "break",
    "if (false) { break }",
    "fn invalid() returns null { break }",
  ]) {
    assert.throws(
      () => parse(source),
      /E_BREAK_CONTEXT: 'break' can only be used inside a loop/,
    );
  }

  for (const source of [
    "while (true) { break }",
    "1.times() { break }",
    "list[1].each(item) { break }",
  ]) {
    assert.doesNotThrow(() => parse(source));
  }
});

test("rejects break values, labels, and directly unreachable expressions", () => {
  assert.throws(() => parse("while (true) { break 1 }"));
  assert.throws(() => parse("while (true) { break outer }"));
  assert.throws(
    () =>
      parse(`while (true) {
  break
  1
}`),
    /Unreachable expression after unconditional break/,
  );
  assert.throws(
    () =>
      parse(`while (true) {
  if (true) {
    break
    1
  }
}`),
    /Unreachable expression after unconditional break/,
  );
});

test("does not make an outer expression unreachable after conditional break", () => {
  assert.doesNotThrow(() =>
    parse(`while (true) {
  if (false) {
    break
  }
  1
  break
}`),
  );
});
