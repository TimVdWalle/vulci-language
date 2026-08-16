// Phase 10

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { parseStringLiteral } from "../src/parser/string-parser.js";

function parseExpression(source: string) {
  return new Parser(new Lexer(source).lex()).parse().statements[0]?.expression;
}

test("parses interpolated strings as expression segments", () => {
  const expression = parseExpression('"value: {{1 + 2}}"');

  assert.equal(expression?.type, "StringLiteral");

  if (expression?.type !== "StringLiteral") {
    return;
  }

  assert.equal(expression.segments[1]?.type, "Interpolation");
});

test("parses a string token without pre-scanned segments", () => {
  const token = new Lexer('""').lex()[0]!;
  delete token.stringSegments;

  assert.deepEqual(parseStringLiteral(token).segments, []);
});

test("parses string member calls", () => {
  const expression = parseExpression('"hello".contains("ell")');

  assert.equal(expression?.type, "MemberCall");
});

test("parses tilde at addition precedence", () => {
  const expression = parseExpression('"a" ~ "b" + "c"');

  assert.equal(expression?.type, "BinaryExpression");

  if (expression?.type !== "BinaryExpression") {
    return;
  }

  assert.equal(expression.operator.lexeme, "+");
  assert.equal(expression.left.type, "BinaryExpression");
});
