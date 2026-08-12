// Phase 15

import { scanStringLiteral } from "../string-lexer.js";
import { Token, TokenType } from "../token.js";

export abstract class LexerState {
  protected readonly tokens: Token[] = [];
  protected current = 0;
  protected line = 1;
  protected column = 1;

  constructor(protected readonly source: string) {}

  protected scanString(line: number, column: number): void {
    const start = this.current - 1;
    const result = scanStringLiteral(this.source, start, line, column);

    this.current = result.end;
    this.line = result.line;
    this.column = result.column;
    this.tokens.push({
      type: TokenType.String,
      lexeme: result.lexeme,
      line,
      column,
      stringSegments: result.segments,
    });
  }

  protected scanBlockComment(line: number, column: number): void {
    let depth = 1;

    while (!this.isAtEnd()) {
      if (this.peek() === "/" && this.peekNext() === "*") {
        this.advance();
        this.advance();
        depth++;
        continue;
      }

      if (this.peek() === "*" && this.peekNext() === "/") {
        this.advance();
        this.advance();
        depth--;

        if (depth === 0) return;
        continue;
      }

      if (this.advance() === "\n") {
        this.line++;
        this.column = 1;
      }
    }

    throw new Error(`Unterminated block comment at ${line}:${column}`);
  }

  protected scanInteger(line: number, column: number): void {
    const start = this.current - 1;

    while (this.isDigit(this.peek()) || this.peek() === "_") {
      if (this.peek() === "_") {
        const separatorLine = this.line;
        const separatorColumn = this.column;

        this.advance();

        if (!this.isDigit(this.peek())) {
          throw new Error(
            `Invalid integer separator at ${separatorLine}:${separatorColumn}`,
          );
        }

        continue;
      }

      this.advance();
    }

    this.addToken(
      TokenType.Integer,
      this.source.slice(start, this.current),
      line,
      column,
    );
  }

  protected scanIdentifier(line: number, column: number): void {
    const start = this.current - 1;

    while (this.isIdentifierPart(this.peek())) this.advance();

    const lexeme = this.source.slice(start, this.current);
    const type = this.keywordType(lexeme);

    this.addToken(type, lexeme, line, column);
  }

  protected scanGlobalIdentifier(line: number, column: number): void {
    const start = this.current - 1;

    if (!this.isIdentifierStart(this.peek())) {
      throw new Error(`Invalid global identifier at ${line}:${column}`);
    }

    while (this.isIdentifierPart(this.peek())) this.advance();

    this.addToken(
      TokenType.Identifier,
      this.source.slice(start, this.current),
      line,
      column,
    );
  }

  protected addToken(
    type: TokenType,
    lexeme: string,
    line: number,
    column: number,
    whitespaceBefore?: boolean,
    whitespaceAfter?: boolean,
  ): void {
    const token: Token = { type, lexeme, line, column };

    if (whitespaceBefore !== undefined) {
      token.whitespaceBefore = whitespaceBefore;
    }

    if (whitespaceAfter !== undefined) {
      token.whitespaceAfter = whitespaceAfter;
    }

    this.tokens.push(token);
  }

  protected hasWhitespaceBeforeCurrentToken(): boolean {
    const previous = this.source[this.current - 2];
    return previous === " " || previous === "\t" || previous === "\r";
  }

  protected hasWhitespaceAfterCurrentToken(): boolean {
    const next = this.source[this.current];
    return next === " " || next === "\t" || next === "\r";
  }

  protected advance(): string {
    const character = this.source[this.current];
    this.current++;
    this.column++;
    return character ?? "\0";
  }

  protected match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.current] !== expected) return false;
    this.current++;
    this.column++;
    return true;
  }

  protected peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source[this.current] ?? "\0";
  }

  protected peekNext(): string {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source[this.current + 1] ?? "\0";
  }

  protected isDigit(character: string): boolean {
    return character >= "0" && character <= "9";
  }

  protected isIdentifierStart(character: string): boolean {
    return (
      (character >= "a" && character <= "z") ||
      (character >= "A" && character <= "Z") ||
      character === "_"
    );
  }

  protected isIdentifierPart(character: string): boolean {
    return this.isIdentifierStart(character) || this.isDigit(character);
  }

  protected isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private keywordType(lexeme: string): TokenType {
    switch (lexeme) {
      case "true":
        return TokenType.True;
      case "false":
        return TokenType.False;
      case "null":
        return TokenType.Null;
      case "if":
        return TokenType.If;
      case "else":
        return TokenType.Else;
      case "fn":
        return TokenType.Fn;
      case "struct":
        return TokenType.Struct;
      case "enum":
        return TokenType.Enum;
      case "return":
        return TokenType.Return;
      case "returns":
        return TokenType.Returns;
      case "and":
        return TokenType.And;
      case "or":
        return TokenType.Or;
      case "not":
        return TokenType.Not;
      case "is":
        return TokenType.Is;
      case "import":
        return TokenType.Import;
      default:
        return TokenType.Identifier;
    }
  }
}
