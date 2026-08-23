// Phase 18

import type { Expression } from "./ast.js";
import type { Token } from "./token.js";

export interface TimesExpression {
  type: "TimesExpression";
  receiver: Expression;
  keyword: Token;
  binding: Token | null;
  expressions: Expression[];
}

export interface WhileExpression {
  type: "WhileExpression";
  keyword: Token;
  condition: Expression;
  expressions: Expression[];
}

export interface BreakExpression {
  type: "BreakExpression";
  keyword: Token;
}
