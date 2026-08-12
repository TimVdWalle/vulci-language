// Phase 15

import { Expression, StringLiteral, StringSegment } from "../ast.js";
import { Lexer } from "../lexer.js";
import { Parser } from "../parser.js";
import { ScannedStringInterpolationSegment, Token } from "../token.js";
import { ParserOptions } from "./parser-context.js";

export function parseStringLiteral(
  token: Token,
  options: ParserOptions = {},
): StringLiteral {
  const segments: StringSegment[] = (token.stringSegments ?? []).map(
    (segment) => {
      if (segment.type === "Text") {
        return segment;
      }

      const interpolationToken: Token = {
        type: token.type,
        lexeme: "{{",
        line: segment.line,
        column: segment.column,
      };

      return {
        type: "Interpolation",
        expression: parseInterpolation(segment, options),
        token: interpolationToken,
      };
    },
  );

  return {
    type: "StringLiteral",
    segments,
    token,
  };
}

function parseInterpolation(
  segment: ScannedStringInterpolationSegment,
  options: ParserOptions,
): Expression {
  const tokens = new Lexer(segment.source).lex();

  for (const token of tokens) {
    token.line += segment.line - 1;

    if (token.line === segment.line) {
      token.column += segment.column - 1;
    }
  }

  return new Parser(tokens, options).parseSingleExpression();
}
