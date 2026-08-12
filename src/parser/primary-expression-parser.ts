// Phase 15

import {
  BooleanLiteral,
  Expression,
  IndexExpression,
  IntegerLiteral,
  NullLiteral,
  TupleLiteral,
  VariableReference,
} from "../ast.js";
import { TokenType } from "../token.js";
import { CallParser } from "./call-parser.js";
import { parseStringLiteral } from "./string-parser.js";

export abstract class PrimaryExpressionParser extends CallParser {
  protected postfix(): Expression {
    let expression = this.primary();

    while (true) {
      if (this.match(TokenType.Dot)) {
        expression = this.finishMember(expression);
        continue;
      }

      if (this.match(TokenType.LeftBracket)) {
        const bracket = this.previous();
        this.skipNewlines();
        const index = this.expression();
        this.skipNewlines();
        this.consume(
          TokenType.RightBracket,
          "Expected ']' after index expression.",
        );
        const node: IndexExpression = {
          type: "IndexExpression",
          target: expression,
          index,
          bracket,
        };
        expression = node;
        continue;
      }

      break;
    }

    return expression;
  }

  protected primary(): Expression {
    if (this.match(TokenType.String)) {
      return parseStringLiteral(this.previous(), this.currentParserOptions());
    }

    if (this.match(TokenType.Integer)) {
      const token = this.previous();
      const value = Number.parseInt(token.lexeme.replaceAll("_", ""), 10);

      if (!Number.isSafeInteger(value)) {
        throw this.error(
          token,
          "Integer literal is outside the supported range.",
        );
      }

      const node: IntegerLiteral = {
        type: "IntegerLiteral",
        value,
      };

      return node;
    }

    if (this.match(TokenType.True, TokenType.False)) {
      const token = this.previous();

      const node: BooleanLiteral = {
        type: "BooleanLiteral",
        value: token.type === TokenType.True,
      };

      return node;
    }

    if (this.match(TokenType.Null)) {
      const node: NullLiteral = {
        type: "NullLiteral",
      };

      return node;
    }

    if (this.match(TokenType.If)) {
      return this.conditionalExpression(this.previous());
    }

    if (this.match(TokenType.Return)) {
      return this.returnExpression(this.previous());
    }

    if (this.match(TokenType.Identifier)) {
      const identifier = this.previous();

      if (this.match(TokenType.LeftParen)) {
        if (identifier.lexeme === "object") {
          return this.finishAnonymousObject(identifier);
        }

        if (this.isStructName(identifier.lexeme)) {
          return this.finishStructConstruction(identifier);
        }

        return this.finishFunctionCall(identifier);
      }

      const node: VariableReference = {
        type: "VariableReference",
        name: identifier.lexeme,
        token: identifier,
      };

      return node;
    }

    if (this.match(TokenType.LeftParen)) {
      const opening = this.previous();
      this.skipNewlines();

      if (this.check(TokenType.RightParen)) {
        throw this.error(opening, "Expected expression inside parentheses.");
      }

      const first = this.expression();
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) {
        this.consume(TokenType.RightParen, "Expected ')' after expression.");
        return first;
      }

      const members: Expression[] = [first];
      this.skipNewlines();

      while (!this.check(TokenType.RightParen)) {
        if (this.check(TokenType.Comma)) {
          throw this.error(this.peek(), "Expected tuple member before ','.");
        }
        members.push(this.expression());
        this.skipNewlines();
        if (!this.match(TokenType.Comma)) break;
        this.skipNewlines();
      }

      this.consume(TokenType.RightParen, "Expected ')' after tuple literal.");

      if (members.length < 2) {
        throw this.error(
          opening,
          "Tuple literals require at least two members.",
        );
      }

      const node: TupleLiteral = { type: "TupleLiteral", members };
      return node;
    }

    throw this.error(this.peek(), "Expected expression.");
  }
}
