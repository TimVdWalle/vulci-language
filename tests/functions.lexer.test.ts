// Phase 7

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { LexerState } from "../src/lexer/lexer-state.js";
import { TokenType } from "../src/token.js";

class LexerStateProbe extends LexerState {
  public readMissingCharacters(): string[] {
    const advanced = this.advance();
    const current = this.peek();
    this.current = 0;
    return [advanced, current, this.peekNext()];
  }
}

test("lexes Phase 7 keywords", () => {
  const tokens = new Lexer("fn return").lex();

  assert.deepEqual(
    tokens.map((token) => ({
      type: token.type,
      lexeme: token.lexeme,
    })),
    [
      {
        type: TokenType.Fn,
        lexeme: "fn",
      },
      {
        type: TokenType.Return,
        lexeme: "return",
      },
      {
        type: TokenType.EOF,
        lexeme: "",
      },
    ],
  );
});

test("lexes a function declaration and call", () => {
  const source = `fn add(left, right) {
  return left + right
}

add(1, 2)`;

  const tokens = new Lexer(source).lex();

  assert.deepEqual(
    tokens.map((token) => token.type),
    [
      TokenType.Fn,
      TokenType.Identifier,
      TokenType.LeftParen,
      TokenType.Identifier,
      TokenType.Comma,
      TokenType.Identifier,
      TokenType.RightParen,
      TokenType.LeftBrace,
      TokenType.Newline,
      TokenType.Return,
      TokenType.Identifier,
      TokenType.Plus,
      TokenType.Identifier,
      TokenType.Newline,
      TokenType.RightBrace,
      TokenType.Newline,
      TokenType.Newline,
      TokenType.Identifier,
      TokenType.LeftParen,
      TokenType.Integer,
      TokenType.Comma,
      TokenType.Integer,
      TokenType.RightParen,
      TokenType.EOF,
    ],
  );
});

test("lexes a function declaration without parameters", () => {
  const tokens = new Lexer(`fn answer() {
  return 42
}`).lex();

  assert.deepEqual(
    tokens.map((token) => token.type),
    [
      TokenType.Fn,
      TokenType.Identifier,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.LeftBrace,
      TokenType.Newline,
      TokenType.Return,
      TokenType.Integer,
      TokenType.Newline,
      TokenType.RightBrace,
      TokenType.EOF,
    ],
  );
});

test("lexes return without a value", () => {
  const tokens = new Lexer(`fn stop() {
  return
}`).lex();

  assert.deepEqual(
    tokens.map((token) => ({
      type: token.type,
      lexeme: token.lexeme,
    })),
    [
      {
        type: TokenType.Fn,
        lexeme: "fn",
      },
      {
        type: TokenType.Identifier,
        lexeme: "stop",
      },
      {
        type: TokenType.LeftParen,
        lexeme: "(",
      },
      {
        type: TokenType.RightParen,
        lexeme: ")",
      },
      {
        type: TokenType.LeftBrace,
        lexeme: "{",
      },
      {
        type: TokenType.Newline,
        lexeme: "\n",
      },
      {
        type: TokenType.Return,
        lexeme: "return",
      },
      {
        type: TokenType.Newline,
        lexeme: "\n",
      },
      {
        type: TokenType.RightBrace,
        lexeme: "}",
      },
      {
        type: TokenType.EOF,
        lexeme: "",
      },
    ],
  );
});

test("lexes global variable identifiers", () => {
  const tokens = new Lexer("$value $counter_2 $result").lex();

  assert.deepEqual(
    tokens.map((token) => ({
      type: token.type,
      lexeme: token.lexeme,
    })),
    [
      {
        type: TokenType.Identifier,
        lexeme: "$value",
      },
      {
        type: TokenType.Identifier,
        lexeme: "$counter_2",
      },
      {
        type: TokenType.Identifier,
        lexeme: "$result",
      },
      {
        type: TokenType.EOF,
        lexeme: "",
      },
    ],
  );
});

test("rejects a global prefix without an identifier", () => {
  assert.throws(() => new Lexer("$").lex(), /Invalid global identifier/);
});

test("uses sentinels for missing lexer-state characters", () => {
  const sparseSource = { length: 2 } as unknown as string;
  assert.deepEqual(new LexerStateProbe(sparseSource).readMissingCharacters(), [
    "\0",
    "\0",
    "\0",
  ]);
});

test("lexes global variable access inside a function", () => {
  const source = `$counter = 0

fn increment() {
  $counter = $counter + 1
}`;

  const tokens = new Lexer(source).lex();

  assert.deepEqual(
    tokens.map((token) => ({
      type: token.type,
      lexeme: token.lexeme,
    })),
    [
      {
        type: TokenType.Identifier,
        lexeme: "$counter",
      },
      {
        type: TokenType.Assign,
        lexeme: "=",
      },
      {
        type: TokenType.Integer,
        lexeme: "0",
      },
      {
        type: TokenType.Newline,
        lexeme: "\n",
      },
      {
        type: TokenType.Newline,
        lexeme: "\n",
      },
      {
        type: TokenType.Fn,
        lexeme: "fn",
      },
      {
        type: TokenType.Identifier,
        lexeme: "increment",
      },
      {
        type: TokenType.LeftParen,
        lexeme: "(",
      },
      {
        type: TokenType.RightParen,
        lexeme: ")",
      },
      {
        type: TokenType.LeftBrace,
        lexeme: "{",
      },
      {
        type: TokenType.Newline,
        lexeme: "\n",
      },
      {
        type: TokenType.Identifier,
        lexeme: "$counter",
      },
      {
        type: TokenType.Assign,
        lexeme: "=",
      },
      {
        type: TokenType.Identifier,
        lexeme: "$counter",
      },
      {
        type: TokenType.Plus,
        lexeme: "+",
      },
      {
        type: TokenType.Integer,
        lexeme: "1",
      },
      {
        type: TokenType.Newline,
        lexeme: "\n",
      },
      {
        type: TokenType.RightBrace,
        lexeme: "}",
      },
      {
        type: TokenType.EOF,
        lexeme: "",
      },
    ],
  );
});

test("tracks Phase 7 token positions", () => {
  const source = `fn add(left, right) {
  return left + right
}`;

  const tokens = new Lexer(source).lex();

  const fnToken = tokens.find((token) => token.type === TokenType.Fn);
  const functionName = tokens.find(
    (token) => token.type === TokenType.Identifier && token.lexeme === "add",
  );
  const returnToken = tokens.find((token) => token.type === TokenType.Return);

  assert.deepEqual(
    {
      line: fnToken?.line,
      column: fnToken?.column,
    },
    {
      line: 1,
      column: 1,
    },
  );

  assert.deepEqual(
    {
      line: functionName?.line,
      column: functionName?.column,
    },
    {
      line: 1,
      column: 4,
    },
  );

  assert.deepEqual(
    {
      line: returnToken?.line,
      column: returnToken?.column,
    },
    {
      line: 2,
      column: 3,
    },
  );
});

test("keeps names containing Phase 7 keywords as identifiers", () => {
  const tokens = new Lexer(
    "function fnValue returnValue returning my_fn",
  ).lex();

  assert.deepEqual(
    tokens.map((token) => ({
      type: token.type,
      lexeme: token.lexeme,
    })),
    [
      {
        type: TokenType.Identifier,
        lexeme: "function",
      },
      {
        type: TokenType.Identifier,
        lexeme: "fnValue",
      },
      {
        type: TokenType.Identifier,
        lexeme: "returnValue",
      },
      {
        type: TokenType.Identifier,
        lexeme: "returning",
      },
      {
        type: TokenType.Identifier,
        lexeme: "my_fn",
      },
      {
        type: TokenType.EOF,
        lexeme: "",
      },
    ],
  );
});
