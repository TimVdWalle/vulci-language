// Phase 16

import {
  FunctionDeclaration,
  StructConstruction,
  StructDeclaration,
  StructFieldDeclaration,
} from "../ast.js";
import { Token, TokenType } from "../token.js";
import { FunctionParser } from "./function-parser.js";

export abstract class StructParser extends FunctionParser {
  protected structDeclaration(keyword: Token): StructDeclaration {
    const name = this.consume(
      TokenType.Identifier,
      "Expected struct name after 'struct'.",
    );

    this.consume(TokenType.LeftBrace, "Expected '{' after struct name.");
    this.skipNewlines();

    const fields: StructFieldDeclaration[] = [];
    const methods: FunctionDeclaration[] = [];
    const memberNames = new Set<string>();

    while (!this.check(TokenType.RightBrace) && !this.isAtEnd()) {
      if (this.match(TokenType.Fn)) {
        const method = this.functionDeclaration(this.previous());
        this.assertUniqueMember(memberNames, method.name);
        this.assertMethodParameters(method);
        methods.push(method);
      } else {
        const field = this.structField();
        this.assertUniqueMember(memberNames, field.name);
        fields.push(field);
      }

      if (this.check(TokenType.RightBrace)) break;
      this.consume(
        TokenType.Newline,
        "Expected a newline after struct member.",
      );
      this.skipNewlines();
    }

    this.consume(TokenType.RightBrace, "Expected '}' after struct body.");

    return { type: "StructDeclaration", keyword, name, fields, methods };
  }

  protected finishStructConstruction(constructor: Token): StructConstruction {
    const fields: StructConstruction["fields"] = [];
    const fieldNames = new Set<string>();

    this.skipNewlines();

    while (!this.check(TokenType.RightParen)) {
      if (this.check(TokenType.Comma)) {
        throw this.error(this.peek(), "Expected struct field before ','.");
      }

      if (!(
        this.check(TokenType.Identifier) && this.checkNext(TokenType.Colon)
      )) {
        throw this.error(
          this.peek(),
          "Struct construction requires named fields.",
        );
      }

      const name = this.advance();
      this.advance();
      this.skipNewlines();

      if (fieldNames.has(name.lexeme)) {
        throw this.error(
          name,
          `E_STRUCT_FIELD_DUP: Struct field '${name.lexeme}' is supplied more than once.`,
        );
      }

      fieldNames.add(name.lexeme);
      fields.push({ name, value: this.expression() });
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.RightParen)) break;
    }

    this.consume(
      TokenType.RightParen,
      "Expected ')' after struct construction.",
    );
    return { type: "StructConstruction", constructor, fields };
  }

  private structField(): StructFieldDeclaration {
    if (this.check(TokenType.Pipe)) {
      throw this.error(this.peek(), "A union type cannot start with '|'.");
    }

    const firstType = this.consumeTypeName("Expected struct field type.");
    const fieldType = this.finishTypeAnnotation(firstType, false);
    const name = this.consume(
      TokenType.Identifier,
      "Expected field name after type declaration.",
    );

    let defaultValue = null;

    if (this.match(TokenType.Assign)) {
      this.skipNewlines();
      defaultValue = this.expression();

      if (this.containsAssignment(defaultValue)) {
        throw this.error(
          name,
          "Assignments are not allowed in struct field defaults.",
        );
      }
    }

    return { name, fieldType, defaultValue };
  }

  private assertUniqueMember(names: Set<string>, member: Token): void {
    if (names.has(member.lexeme)) {
      throw this.error(
        member,
        `E_STRUCT_MEMBER_DUP: Duplicate struct member '${member.lexeme}'.`,
      );
    }

    names.add(member.lexeme);
  }

  private assertMethodParameters(method: FunctionDeclaration): void {
    const selfParameter = method.parameters.find(
      (parameter) => parameter.lexeme === "self",
    );

    if (selfParameter !== undefined) {
      throw this.error(
        selfParameter,
        "Struct methods cannot declare a parameter named 'self'.",
      );
    }
  }
}
