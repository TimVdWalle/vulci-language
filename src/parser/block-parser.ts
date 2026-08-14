// Phase 15B

import {
  ConditionalBranch,
  ConditionalExpression,
  Expression,
} from "../ast.js";
import { Token, TokenType } from "../token.js";
import { TypeParser } from "./type-parser.js";

export abstract class BlockParser extends TypeParser {
  protected conditionalExpression(firstKeyword: Token): ConditionalExpression {
    this.skipNewlines();

    const branches: ConditionalBranch[] = [
      this.conditionalBranch(firstKeyword),
    ];

    let elseKeyword: Token | null = null;
    let elseExpressions: Expression[] | null = null;

    while (true) {
      const positionBeforeNewlines = this.current;

      this.skipNewlines();

      if (!this.match(TokenType.Else)) {
        this.current = positionBeforeNewlines;
        break;
      }

      const currentElse = this.previous();

      this.skipNewlines();

      if (this.match(TokenType.If)) {
        this.skipNewlines();
        branches.push(this.conditionalBranch(this.previous()));

        continue;
      }

      elseKeyword = currentElse;
      elseExpressions = this.expressionBlock();
      break;
    }

    return {
      type: "ConditionalExpression",
      branches,
      elseKeyword,
      elseExpressions,
    };
  }

  protected conditionalBranch(keyword: Token): ConditionalBranch {
    this.consume(TokenType.LeftParen, "Expected '(' after 'if'.");

    this.skipNewlines();

    const condition = this.expression();

    this.skipNewlines();

    this.consume(TokenType.RightParen, "Expected ')' after condition.");

    return {
      keyword,
      condition,
      expressions: this.expressionBlock(),
    };
  }

  protected expressionBlock(): Expression[] {
    this.skipNewlines();

    this.consume(TokenType.LeftBrace, "Expected '{' before branch body.");

    this.skipNewlines();

    if (this.check(TokenType.RightBrace)) {
      throw this.error(this.peek(), "Conditional branches cannot be empty.");
    }

    const expressions: Expression[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const expression = this.expression();

      expressions.push(expression);

      if (this.check(TokenType.RightBrace)) {
        break;
      }

      if (this.isAtEnd()) {
        throw this.error(this.peek(), "Expected '}' after branch body.");
      }

      this.consume(TokenType.Newline, "Expected a newline after expression.");

      this.skipNewlines();

      if (
        expression.type === "ReturnExpression" &&
        !this.check(TokenType.RightBrace)
      ) {
        throw this.error(
          this.peek(),
          "Unreachable expression after unconditional return.",
        );
      }
    }

    this.consume(TokenType.RightBrace, "Expected '}' after branch body.");

    return expressions;
  }

  protected functionExpressionBlock(): Expression[] {
    this.skipNewlines();

    this.consume(TokenType.LeftBrace, "Expected '{' before function body.");

    this.skipNewlines();

    if (this.check(TokenType.RightBrace)) {
      throw this.error(this.peek(), "Function bodies cannot be empty.");
    }

    const expressions: Expression[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const expression = this.expression();

      expressions.push(expression);

      if (this.check(TokenType.RightBrace)) {
        break;
      }

      if (this.isAtEnd()) {
        throw this.error(this.peek(), "Expected '}' after function body.");
      }

      this.consume(TokenType.Newline, "Expected a newline after expression.");

      this.skipNewlines();

      if (
        expression.type === "ReturnExpression" &&
        !this.check(TokenType.RightBrace)
      ) {
        throw this.error(
          this.peek(),
          "Unreachable expression after unconditional return.",
        );
      }
    }

    this.consume(TokenType.RightBrace, "Expected '}' after function body.");

    return expressions;
  }
}
