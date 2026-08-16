// Phase 17

import type { Expression, TypeAnnotation } from "./ast.js";
import type { Token } from "./token.js";

export interface EachBinding {
  name: Token;
  bindingType: TypeAnnotation | null;
}

export interface EachExpression {
  type: "EachExpression";
  receiver: Expression;
  keyword: Token;
  bindings: EachBinding[];
  expressions: Expression[];
}
