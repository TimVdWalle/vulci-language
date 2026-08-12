// Phase 15

export enum TokenType {
  Integer,
  String,
  Identifier,
  True,
  False,
  Null,
  If,
  Else,
  Fn,
  Struct,
  Enum,
  Return,
  Returns,
  And,
  Or,
  Not,
  Is,
  Import,
  Assign,
  EqualEqual,
  BangEqual,
  Less,
  LessEqual,
  Greater,
  GreaterEqual,
  Plus,
  Minus,
  Tilde,
  Star,
  Slash,
  Percent,
  Pipe,
  Dot,
  LeftParen,
  RightParen,
  LeftBrace,
  RightBrace,
  LeftBracket,
  RightBracket,
  Comma,
  Colon,
  Newline,
  EOF,
}

export interface ScannedStringTextSegment {
  type: "Text";
  value: string;
}

export interface ScannedStringInterpolationSegment {
  type: "Interpolation";
  source: string;
  line: number;
  column: number;
}

export type ScannedStringSegment =
  ScannedStringTextSegment | ScannedStringInterpolationSegment;

export interface Token {
  type: TokenType;
  lexeme: string;
  line: number;
  column: number;
  stringSegments?: ScannedStringSegment[];
  whitespaceBefore?: boolean;
  whitespaceAfter?: boolean;
}
