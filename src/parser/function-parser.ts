// Phase 16

import {
  Expression,
  FunctionDeclaration,
  ReturnExpression,
  TypeAnnotation,
} from "../ast.js";
import { Token, TokenType } from "../token.js";
import { BlockParser } from "./block-parser.js";

export abstract class FunctionParser extends BlockParser {
  protected functionDeclaration(keyword: Token): FunctionDeclaration {
    const name = this.consume(
      TokenType.Identifier,
      "Expected function name after 'fn'.",
    );

    if (name.lexeme.startsWith("$")) {
      throw this.error(name, "Function names cannot be global identifiers.");
    }

    this.consume(TokenType.LeftParen, "Expected '(' after function name.");

    const parameters: Token[] = [];
    const parameterTypes: (TypeAnnotation | null)[] = [];
    const parameterDefaults: (Expression | null)[] = [];
    const parameterNames = new Set<string>();

    let hasExplicitParameterType = false;
    let hasOptionalParameter = false;

    this.skipNewlines();

    while (!this.check(TokenType.RightParen)) {
      if (this.check(TokenType.Comma)) {
        throw this.error(this.peek(), "Expected parameter before ','.");
      }

      if (this.check(TokenType.Pipe)) {
        throw this.error(this.peek(), "A union type cannot start with '|'.");
      }

      const first = this.consumeTypeName("Expected parameter name or type.");

      let parameter: Token;
      let parameterType: TypeAnnotation | null = null;

      const startsTypedParameter =
        this.knownTypeNames.has(first.lexeme) ||
        first.lexeme === "tuple" ||
        this.check(TokenType.Pipe) ||
        this.check(TokenType.Identifier);

      if (startsTypedParameter) {
        parameterType = this.finishTypeAnnotation(first);
        this.emitBareCollectionTypeWarnings(parameterType);
        hasExplicitParameterType = true;

        parameter = this.consume(
          TokenType.Identifier,
          "Expected parameter name after type declaration.",
        );
      } else {
        parameter = first;

        this.emitStrongWarning(
          `parameter '${parameter.lexeme}' has no declared type and is treated as 'any'`,
          parameter,
        );
      }

      if (parameter.lexeme.startsWith("$")) {
        throw this.error(
          parameter,
          "Function parameters cannot be global identifiers.",
        );
      }

      if (parameterNames.has(parameter.lexeme)) {
        throw this.error(
          parameter,
          `Duplicate parameter '${parameter.lexeme}'.`,
        );
      }

      parameterNames.add(parameter.lexeme);
      parameters.push(parameter);
      parameterTypes.push(parameterType);

      let parameterDefault: Expression | null = null;

      if (this.match(TokenType.Assign)) {
        this.skipNewlines();

        parameterDefault = this.expression();

        if (this.containsAssignment(parameterDefault)) {
          throw this.error(
            parameter,
            "Assignments are not allowed in default parameter values.",
          );
        }

        hasOptionalParameter = true;
      } else if (hasOptionalParameter) {
        throw this.error(
          parameter,
          "Required parameters must appear before optional parameters.",
        );
      }

      parameterDefaults.push(parameterDefault);

      this.skipNewlines();

      if (!this.match(TokenType.Comma)) {
        break;
      }

      this.skipNewlines();

      if (this.check(TokenType.RightParen)) {
        break;
      }
    }

    this.consume(
      TokenType.RightParen,
      "Expected ')' after function parameters.",
    );

    let returnType: TypeAnnotation | undefined;

    if (this.match(TokenType.Returns)) {
      if (this.check(TokenType.Pipe)) {
        throw this.error(this.peek(), "A union type cannot start with '|'.");
      }

      const firstReturnType = this.consumeTypeName(
        "Expected return type after 'returns'.",
      );

      returnType = this.finishTypeAnnotation(firstReturnType);
      this.emitBareCollectionTypeWarnings(returnType);
    } else {
      this.emitStrongWarning(
        `function '${name.lexeme}' has no declared return type and is treated as 'any'`,
        name,
      );
    }

    const node: FunctionDeclaration = {
      type: "FunctionDeclaration",
      keyword,
      name,
      parameters,
      parameterDefaults,
      expressions: this.functionExpressionBlock(),
    };

    if (hasExplicitParameterType) {
      node.parameterTypes = parameterTypes;
    }

    if (returnType !== undefined) {
      node.returnType = returnType;
    }

    return node;
  }

  protected returnExpression(keyword: Token): ReturnExpression {
    if (
      this.check(TokenType.Newline) ||
      this.check(TokenType.RightBrace) ||
      this.check(TokenType.EOF)
    ) {
      return {
        type: "ReturnExpression",
        keyword,
        value: null,
      };
    }

    return {
      type: "ReturnExpression",
      keyword,
      value: this.expression(),
    };
  }
}
