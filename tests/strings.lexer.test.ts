// Phase 15B

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { scanStringLiteral } from "../src/string-lexer.js";
import { TokenType } from "../src/token.js";

test("lexes single-line string forms and string operators", () => {
  const tokens = new Lexer(`"hello" ~ 'world'.count()`).lex();

  assert.deepEqual(
    tokens.map((token) => token.type),
    [
      TokenType.String,
      TokenType.Tilde,
      TokenType.String,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.EOF,
    ],
  );
});

test("decodes accepted string escapes", () => {
  const [token] = new Lexer(String.raw`"a\n\t\r\\\"\'"`).lex();

  assert.deepEqual(token?.stringSegments, [
    { type: "Text", value: "a\n\t\r\\\"'" },
  ]);
});

test("keeps interpolation-looking text literal in single quotes", () => {
  const [token] = new Lexer("'Hello, {{name}}'").lex();

  assert.deepEqual(token?.stringSegments, [
    { type: "Text", value: "Hello, {{name}}" },
  ]);
});

test("records interpolation segments in double quotes", () => {
  const [token] = new Lexer('"Hello, {{name}}!"').lex();

  assert.deepEqual(token?.stringSegments, [
    { type: "Text", value: "Hello, " },
    { type: "Interpolation", source: "name", line: 1, column: 11 },
    { type: "Text", value: "!" },
  ]);
});

test("strips multiline boundary newlines and common indentation", () => {
  const [token] = new Lexer(`"""
    first
      second
    third
"""`).lex();

  assert.deepEqual(token?.stringSegments, [
    { type: "Text", value: "first\n  second\nthird" },
  ]);
});

test("normalizes empty, blank, and interpolated multiline strings", () => {
  assert.deepEqual(scanStringLiteral('""""""', 0, 1, 1).segments, []);

  const result = scanStringLiteral(
    '"""\n  before {{ value }}\n  \n  after\n"""',
    0,
    1,
    1,
  );

  assert.deepEqual(result.segments, [
    { type: "Text", value: "before " },
    {
      type: "Interpolation",
      source: " value ",
      line: 2,
      column: 12,
    },
    { type: "Text", value: "\n  \nafter" },
  ]);
});

test("reports stable string syntax diagnostics", () => {
  assert.throws(() => new Lexer(String.raw`"bad\x"`).lex(), /E_STR_ESC:/);
  assert.throws(() => new Lexer('"bad\nline"').lex(), /E_STR_NL:/);
  assert.throws(() => new Lexer('"bad').lex(), /E_STR_UNCLOSED:/);
  assert.throws(() => new Lexer('"{{ }}"').lex(), /E_IPL_EMPTY:/);
  assert.throws(() => new Lexer('"text }}"').lex(), /E_IPL_CLOSE:/);
  assert.throws(() => new Lexer('"{{value"').lex(), /E_IPL_UNCLOSED:/);
  assert.throws(() => scanStringLiteral('"\\', 0, 1, 1), /E_STR_ESC:/);
});
