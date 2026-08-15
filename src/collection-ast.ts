// Phase 16

import type { Expression, TypeAnnotation } from "./ast.js";
import type { Token } from "./token.js";

export type ConcreteCollectionTypeName = "list" | "set" | "map";

export interface CollectionTypeMember {
  type: "CollectionType";
  lexeme: ConcreteCollectionTypeName;
  token: Token;
  arguments: TypeAnnotation[];
}

export interface ListLiteral {
  type: "ListLiteral";
  keyword: Token;
  items: Expression[];
}

export interface SetLiteral {
  type: "SetLiteral";
  keyword: Token;
  items: Expression[];
}

export interface MapLiteralEntry {
  key: Expression;
  colon: Token;
  value: Expression;
}

export interface MapLiteral {
  type: "MapLiteral";
  keyword: Token;
  entries: MapLiteralEntry[];
}

export type CollectionLiteral = ListLiteral | SetLiteral | MapLiteral;
