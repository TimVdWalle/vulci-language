// Phase 17

import { EachBinding, EachExpression, Expression } from "../ast.js";
import { Token, TokenType } from "../token.js";
import { CollectionLiteralParser } from "./collection-literal-parser.js";

export abstract class EachParser extends CollectionLiteralParser {
  protected finishEachExpression(
    receiver: Expression,
    keyword: Token,
  ): EachExpression {
    this.consume(TokenType.LeftParen, "Expected '(' after 'each'.");
    this.skipNewlines();

    if (this.check(TokenType.RightParen)) {
      throw this.error(
        keyword,
        "Each expressions require at least one binding.",
      );
    }

    const bindings: EachBinding[] = [];
    const names = new Set<string>();

    while (!this.check(TokenType.RightParen)) {
      if (bindings.length === 2) {
        throw this.error(
          this.peek(),
          "Each expressions accept at most two bindings.",
        );
      }

      const binding = this.eachBinding();

      if (names.has(binding.name.lexeme)) {
        throw this.error(
          binding.name,
          `Duplicate each binding '${binding.name.lexeme}'.`,
        );
      }

      names.add(binding.name.lexeme);
      bindings.push(binding);
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.RightParen)) break;
    }

    this.consume(TokenType.RightParen, "Expected ')' after each bindings.");

    return {
      type: "EachExpression",
      receiver,
      keyword,
      bindings,
      expressions: this.eachExpressionBlock(),
    };
  }

  private eachBinding(): EachBinding {
    if (this.check(TokenType.Comma)) {
      throw this.error(this.peek(), "Expected each binding before ','.");
    }

    if (this.check(TokenType.Pipe)) {
      throw this.error(this.peek(), "A union type cannot start with '|'.");
    }

    const first = this.consumeTypeName("Expected each binding name or type.");

    if (first.lexeme.startsWith("$")) {
      throw this.error(first, "Each bindings cannot be global identifiers.");
    }

    const startsTypedBinding =
      this.knownTypeNames.has(first.lexeme) ||
      first.lexeme === "tuple" ||
      this.check(TokenType.Less) ||
      this.check(TokenType.Pipe) ||
      this.check(TokenType.Identifier);

    if (!startsTypedBinding) {
      return { name: first, bindingType: null };
    }

    const bindingType = this.finishTypeAnnotation(first);
    const name = this.consume(
      TokenType.Identifier,
      "Expected each binding name after type declaration.",
    );

    if (name.lexeme.startsWith("$")) {
      throw this.error(name, "Each bindings cannot be global identifiers.");
    }

    return { name, bindingType };
  }

  private eachExpressionBlock(): Expression[] {
    this.skipNewlines();
    this.consume(TokenType.LeftBrace, "Expected '{' before each body.");
    this.skipNewlines();

    const expressions: Expression[] = [];

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      const expression = this.expression();
      expressions.push(expression);

      if (this.check(TokenType.RightBrace)) break;

      if (this.isAtEnd()) {
        throw this.error(this.peek(), "Expected '}' after each body.");
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

    this.consume(TokenType.RightBrace, "Expected '}' after each body.");
    return expressions;
  }
}
