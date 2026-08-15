// Phase 16

import { TypeAnnotation, TypeMember } from "../ast.js";
import {
  CollectionTypeMember,
  ConcreteCollectionTypeName,
} from "../collection-ast.js";
import { Token, TokenType } from "../token.js";
import { ParserContext } from "./parser-context.js";

export abstract class TypeParser extends ParserContext {
  protected finishTypeAnnotation(
    first: Token,
    allowCollectionTypes = true,
  ): TypeAnnotation {
    const members: TypeMember[] = [
      this.finishTypeMember(first, allowCollectionTypes),
    ];
    const memberNames = new Set<string>([this.typeMemberName(members[0]!)]);

    while (this.match(TokenType.Pipe)) {
      if (this.check(TokenType.Pipe)) {
        throw this.error(
          this.peek(),
          "A union type cannot contain repeated '|'.",
        );
      }

      const token = this.consumeTypeName("Expected a type name after '|'.");
      const member = this.finishTypeMember(token, allowCollectionTypes);
      const name = this.typeMemberName(member);

      if (memberNames.has(name)) {
        throw this.error(token, `Duplicate union member '${name}'.`);
      }

      memberNames.add(name);
      members.push(member);
    }

    if (members.length > 1 && memberNames.has("any")) {
      const anyMember = members.find((member) => member.lexeme === "any")!;
      throw this.error(
        anyMember.token,
        "'any' cannot appear inside a union type.",
      );
    }

    return { members };
  }

  private finishTypeMember(
    token: Token,
    allowCollectionTypes: boolean,
  ): TypeMember {
    if (
      !allowCollectionTypes &&
      (token.lexeme === "list" ||
        token.lexeme === "set" ||
        token.lexeme === "map" ||
        token.lexeme === "collection")
    ) {
      throw this.error(
        token,
        "Collection types are accepted only at function boundaries and in " +
          "type inspection.",
      );
    }

    if (
      token.lexeme === "list" ||
      token.lexeme === "set" ||
      token.lexeme === "map"
    ) {
      if (this.check(TokenType.Less)) {
        return this.finishCollectionType(token, token.lexeme);
      }
    }

    if (token.lexeme === "collection" && this.check(TokenType.Less)) {
      throw this.error(
        token,
        "The broad 'collection' type does not accept type arguments.",
      );
    }

    if (token.lexeme === "tuple") {
      if (this.check(TokenType.LeftParen)) {
        return this.finishTupleType(token, allowCollectionTypes);
      }

      if (!this.isEnumName(token.lexeme)) {
        throw this.error(token, "A bare 'tuple' type does not exist.");
      }
    }

    this.validateTypeName(token);
    return { type: "NamedType", lexeme: token.lexeme, token };
  }

  private finishCollectionType(
    token: Token,
    lexeme: ConcreteCollectionTypeName,
  ): CollectionTypeMember {
    this.consume(TokenType.Less, `Expected '<' after '${lexeme}'.`);
    this.skipNewlines();

    const arguments_: TypeAnnotation[] = [];

    if (this.check(TokenType.Greater)) {
      throw this.error(
        this.peek(),
        `Collection type '${lexeme}' requires type arguments.`,
      );
    }

    while (true) {
      if (this.check(TokenType.Comma)) {
        throw this.error(
          this.peek(),
          `Expected a '${lexeme}' type argument before ','.`,
        );
      }

      const first = this.consumeTypeName(
        `Expected a type argument for '${lexeme}'.`,
      );
      arguments_.push(this.finishTypeAnnotation(first));
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.Greater)) break;
    }

    this.consume(TokenType.Greater, `Expected '>' after '${lexeme}' type.`);

    const expectedCount = lexeme === "map" ? 2 : 1;
    if (arguments_.length !== expectedCount) {
      throw this.error(
        token,
        `Collection type '${lexeme}' requires exactly ${expectedCount} type ` +
          `argument${expectedCount === 1 ? "" : "s"}.`,
      );
    }

    return { type: "CollectionType", lexeme, token, arguments: arguments_ };
  }

  private finishTupleType(
    token: Token,
    allowCollectionTypes: boolean,
  ): TypeMember {
    this.consume(TokenType.LeftParen, "Expected '(' after 'tuple'.");

    const members: TypeAnnotation[] = [];
    this.skipNewlines();

    if (this.check(TokenType.RightParen)) {
      throw this.error(
        this.peek(),
        "Tuple types require at least two member types.",
      );
    }

    while (true) {
      if (this.check(TokenType.Comma)) {
        throw this.error(
          this.peek(),
          "Expected a tuple member type before ','.",
        );
      }

      const first = this.consumeTypeName("Expected a tuple member type.");
      members.push(this.finishTypeAnnotation(first, allowCollectionTypes));
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.RightParen)) break;
    }

    this.consume(TokenType.RightParen, "Expected ')' after tuple type.");

    if (members.length < 2) {
      throw this.error(token, "Tuple types require at least two member types.");
    }

    return { type: "TupleType", lexeme: "tuple", token, members };
  }

  private typeMemberName(member: TypeMember): string {
    if (member.type === "NamedType") return member.lexeme;
    if (member.type === "CollectionType") {
      return `${member.lexeme}<${member.arguments
        .map((item) => this.typeAnnotationText(item))
        .join(", ")}>`;
    }
    return `tuple(${member.members.map((item) => this.typeAnnotationText(item)).join(", ")})`;
  }

  private typeAnnotationText(annotation: TypeAnnotation): string {
    return annotation.members
      .map((member) => this.typeMemberName(member))
      .join("|");
  }

  protected validateTypeName(token: Token): void {
    if (!this.allowUnknownTypeNames && !this.knownTypeNames.has(token.lexeme)) {
      throw this.error(token, `Unknown type name '${token.lexeme}'.`);
    }
  }

  protected emitBareCollectionTypeWarnings(annotation: TypeAnnotation): void {
    for (const member of annotation.members) {
      if (member.type === "TupleType") {
        for (const nested of member.members) {
          this.emitBareCollectionTypeWarnings(nested);
        }
        continue;
      }

      if (member.type === "CollectionType") {
        for (const argument of member.arguments) {
          this.emitBareCollectionTypeWarnings(argument);
        }
        continue;
      }

      if (
        member.lexeme === "list" ||
        member.lexeme === "set" ||
        member.lexeme === "map"
      ) {
        this.emitWarning(
          `collection type '${member.lexeme}' has unspecified contained ` +
            "types and is unrestricted",
          member.token,
        );
      }
    }
  }

  protected consumeTypeName(message: string): Token {
    if (this.match(TokenType.Identifier, TokenType.Null))
      return this.previous();
    throw this.error(this.peek(), message);
  }
}
