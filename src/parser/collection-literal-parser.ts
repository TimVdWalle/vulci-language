// Phase 16

import {
  CollectionLiteral,
  ListLiteral,
  MapLiteral,
  MapLiteralEntry,
  SetLiteral,
} from "../collection-ast.js";
import { Expression } from "../ast.js";
import { Token, TokenType } from "../token.js";
import { ObjectParser } from "./object-parser.js";

export abstract class CollectionLiteralParser extends ObjectParser {
  protected finishCollectionLiteral(keyword: Token): CollectionLiteral {
    if (keyword.lexeme === "map") return this.finishMapLiteral(keyword);

    const items = this.finishCollectionItems(keyword.lexeme);

    if (keyword.lexeme === "list") {
      const node: ListLiteral = { type: "ListLiteral", keyword, items };
      return node;
    }

    const node: SetLiteral = { type: "SetLiteral", keyword, items };
    return node;
  }

  private finishCollectionItems(kind: string): Expression[] {
    const items: Expression[] = [];
    this.skipNewlines();

    while (!this.check(TokenType.RightBracket)) {
      if (this.check(TokenType.Comma)) {
        throw this.error(this.peek(), `Expected ${kind} item before ','.`);
      }

      items.push(this.expression());
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.RightBracket)) break;
    }

    this.consume(TokenType.RightBracket, `Expected ']' after ${kind} literal.`);
    return items;
  }

  private finishMapLiteral(keyword: Token): MapLiteral {
    const entries: MapLiteralEntry[] = [];
    this.skipNewlines();

    while (!this.check(TokenType.RightBracket)) {
      if (this.check(TokenType.Comma)) {
        throw this.error(this.peek(), "Expected map entry before ','.");
      }

      const key = this.expression();
      this.skipNewlines();
      const colon = this.consume(
        TokenType.Colon,
        "Expected ':' between map key and value.",
      );
      this.skipNewlines();
      const value = this.expression();
      entries.push({ key, colon, value });
      this.skipNewlines();

      if (!this.match(TokenType.Comma)) break;
      this.skipNewlines();
      if (this.check(TokenType.RightBracket)) break;
    }

    this.consume(TokenType.RightBracket, "Expected ']' after map literal.");
    return { type: "MapLiteral", keyword, entries };
  }
}
