// Phase 18

import {
  BreakExpression,
  Expression,
  TimesExpression,
  WhileExpression,
} from "../ast.js";
import { Token, TokenType } from "../token.js";
import { EachParser } from "./each-parser.js";

export abstract class LoopParser extends EachParser {
  protected finishTimesExpression(
    receiver: Expression,
    keyword: Token,
  ): TimesExpression {
    this.consume(TokenType.LeftParen, "Expected '(' after 'times'.");
    this.skipNewlines();

    let binding: Token | null = null;

    if (!this.check(TokenType.RightParen)) {
      if (this.check(TokenType.Comma)) {
        throw this.error(this.peek(), "Expected times binding before ','.");
      }

      binding = this.consume(
        TokenType.Identifier,
        "Expected an untyped index binding in 'times'.",
      );

      if (binding.lexeme.startsWith("$")) {
        throw this.error(
          binding,
          "Times bindings cannot be global identifiers.",
        );
      }

      this.skipNewlines();

      if (this.match(TokenType.Comma)) {
        this.skipNewlines();

        if (!this.check(TokenType.RightParen)) {
          throw this.error(
            this.peek(),
            "Times expressions accept at most one untyped binding.",
          );
        }
      } else if (!this.check(TokenType.RightParen)) {
        throw this.error(
          this.peek(),
          "Times index bindings must be a single untyped identifier.",
        );
      }
    }

    this.consume(TokenType.RightParen, "Expected ')' after times binding.");

    return {
      type: "TimesExpression",
      receiver,
      keyword,
      binding,
      expressions: this.loopExpressionBlock("times"),
    };
  }

  protected whileExpression(keyword: Token): WhileExpression {
    this.consume(TokenType.LeftParen, "Expected '(' after 'while'.");
    this.skipNewlines();
    const condition = this.expression();
    this.skipNewlines();
    this.consume(TokenType.RightParen, "Expected ')' after while condition.");

    return {
      type: "WhileExpression",
      keyword,
      condition,
      expressions: this.loopExpressionBlock("while"),
    };
  }

  protected breakExpression(keyword: Token): BreakExpression {
    if (this.loopDepth === 0) {
      throw this.error(
        keyword,
        "'break' can only be used inside a loop.",
        "E_BREAK_CONTEXT",
      );
    }

    return { type: "BreakExpression", keyword };
  }
}
