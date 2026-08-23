// Phase 18

import {
  EachExpression,
  Expression,
  FunctionCall,
  MemberAccess,
  MemberCall,
  TimesExpression,
} from "../ast.js";
import { Token, TokenType } from "../token.js";
import { LoopParser } from "./loop-parser.js";

interface ParsedArguments {
  arguments: Expression[];
  argumentNames: (Token | null)[];
}

export abstract class CallParser extends LoopParser {
  protected finishMember(
    receiver: Expression,
  ): MemberAccess | MemberCall | EachExpression | TimesExpression {
    const member = this.consume(
      TokenType.Identifier,
      "Expected member name after '.'.",
    );

    if (member.lexeme === "each" && this.hasFollowingLoopBody()) {
      return this.finishEachExpression(receiver, member);
    }

    if (member.lexeme === "times" && this.hasFollowingLoopBody()) {
      return this.finishTimesExpression(receiver, member);
    }

    if (!this.match(TokenType.LeftParen)) {
      return { type: "MemberAccess", receiver, member };
    }

    const parsed = this.finishArguments("Expected ')' after member arguments.");

    return {
      type: "MemberCall",
      receiver,
      member,
      arguments: parsed.arguments,
      argumentNames: parsed.argumentNames,
    };
  }

  protected finishFunctionCall(calleeToken: Token): FunctionCall {
    const parsed = this.finishArguments(
      "Expected ')' after function arguments.",
    );

    return {
      type: "FunctionCall",
      callee: calleeToken.lexeme,
      calleeToken,
      arguments: parsed.arguments,
      argumentNames: parsed.argumentNames,
    };
  }

  protected containsAssignment(expression: Expression): boolean {
    switch (expression.type) {
      case "AssignmentExpression":
        return true;
      case "UnaryExpression":
        return this.containsAssignment(expression.operand);
      case "BinaryExpression":
        return (
          this.containsAssignment(expression.left) ||
          this.containsAssignment(expression.right)
        );
      case "TypeInspectionExpression":
        return this.containsAssignment(expression.value);
      case "ComparisonChainExpression":
        return expression.operands.some((operand) =>
          this.containsAssignment(operand),
        );
      case "ConditionalExpression":
        return (
          expression.branches.some(
            (branch) =>
              this.containsAssignment(branch.condition) ||
              branch.expressions.some((item) => this.containsAssignment(item)),
          ) ||
          (expression.elseExpressions?.some((item) =>
            this.containsAssignment(item),
          ) ??
            false)
        );
      case "FunctionCall":
      case "MemberCall":
        return (
          (expression.type === "MemberCall" &&
            this.containsAssignment(expression.receiver)) ||
          expression.arguments.some((argument) =>
            this.containsAssignment(argument),
          )
        );
      case "MemberAccess":
        return this.containsAssignment(expression.receiver);
      case "EachExpression":
        return (
          this.containsAssignment(expression.receiver) ||
          expression.expressions.some((item) => this.containsAssignment(item))
        );
      case "TimesExpression":
        return (
          this.containsAssignment(expression.receiver) ||
          expression.expressions.some((item) => this.containsAssignment(item))
        );
      case "WhileExpression":
        return (
          this.containsAssignment(expression.condition) ||
          expression.expressions.some((item) => this.containsAssignment(item))
        );
      case "IndexExpression":
        return (
          this.containsAssignment(expression.target) ||
          this.containsAssignment(expression.index)
        );
      case "AnonymousObjectLiteral":
      case "StructConstruction":
        return expression.fields.some((field) =>
          this.containsAssignment(field.value),
        );
      case "ListLiteral":
      case "SetLiteral":
        return expression.items.some((item) => this.containsAssignment(item));
      case "MapLiteral":
        return expression.entries.some(
          (entry) =>
            this.containsAssignment(entry.key) ||
            this.containsAssignment(entry.value),
        );
      case "TupleLiteral":
        return expression.members.some((member) =>
          this.containsAssignment(member),
        );
      case "StringLiteral":
        return expression.segments.some(
          (segment) =>
            segment.type === "Interpolation" &&
            this.containsAssignment(segment.expression),
        );
      case "ReturnExpression":
        return (
          expression.value !== null && this.containsAssignment(expression.value)
        );
      case "FunctionDeclaration":
        return expression.expressions.some((item) =>
          this.containsAssignment(item),
        );
      case "StructDeclaration":
        return (
          expression.fields.some(
            (field) =>
              field.defaultValue !== null &&
              this.containsAssignment(field.defaultValue),
          ) ||
          expression.methods.some((method) => this.containsAssignment(method))
        );
      case "EnumDeclaration":
      case "BreakExpression":
      case "IntegerLiteral":
      case "BooleanLiteral":
      case "NullLiteral":
      case "VariableReference":
        return false;
    }
  }

  private hasFollowingLoopBody(): boolean {
    if (!this.check(TokenType.LeftParen)) return false;

    let depth = 0;

    for (let index = this.current; index < this.tokens.length; index++) {
      const token = this.tokens[index]!;

      if (token.type === TokenType.LeftParen) {
        depth++;
        continue;
      }

      if (token.type !== TokenType.RightParen) continue;

      depth--;
      if (depth !== 0) continue;

      let following = index + 1;
      while (this.tokens[following]?.type === TokenType.Newline) following++;
      return this.tokens[following]?.type === TokenType.LeftBrace;
    }

    return false;
  }

  private finishArguments(closingMessage: string): ParsedArguments {
    const arguments_: Expression[] = [];
    const argumentNames: (Token | null)[] = [];
    const namedArguments = new Set<string>();
    let hasNamedArgument = false;

    this.skipNewlines();

    while (!this.check(TokenType.RightParen)) {
      if (this.check(TokenType.Comma)) {
        throw this.error(this.peek(), "Expected argument before ','.");
      }

      let argumentName: Token | null = null;

      if (this.check(TokenType.Identifier) && this.checkNext(TokenType.Colon)) {
        argumentName = this.advance();
        this.advance();
        this.skipNewlines();

        if (namedArguments.has(argumentName.lexeme)) {
          throw this.error(
            argumentName,
            `Duplicate argument '${argumentName.lexeme}'.`,
          );
        }

        namedArguments.add(argumentName.lexeme);
        hasNamedArgument = true;
      } else if (hasNamedArgument) {
        throw this.error(
          this.peek(),
          "Positional arguments cannot follow named arguments.",
        );
      }

      arguments_.push(this.expression());
      argumentNames.push(argumentName);
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.RightParen)) break;
    }

    this.consume(TokenType.RightParen, closingMessage);
    return { arguments: arguments_, argumentNames };
  }
}
