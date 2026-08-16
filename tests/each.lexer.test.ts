// Phase 17

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { TokenType } from "../src/token.js";

test("lexes each as a contextual identifier with its delimiters", () => {
  const tokens = new Lexer(`values.each(int value, str key) {
  value
}`).lex();

  assert.deepEqual(
    tokens.map((token) => token.type),
    [
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.LeftParen,
      TokenType.Identifier,
      TokenType.Identifier,
      TokenType.Comma,
      TokenType.Identifier,
      TokenType.Identifier,
      TokenType.RightParen,
      TokenType.LeftBrace,
      TokenType.Newline,
      TokenType.Identifier,
      TokenType.Newline,
      TokenType.RightBrace,
      TokenType.EOF,
    ],
  );
  assert.equal(tokens[2]?.lexeme, "each");
});

test("does not introduce break or continue keywords", () => {
  const tokens = new Lexer("each break continue").lex();

  assert.deepEqual(
    tokens.slice(0, -1).map((token) => token.type),
    [TokenType.Identifier, TokenType.Identifier, TokenType.Identifier],
  );
});
