// Phase 17

import { Token } from "./token.js";
import type { EachExpression } from "./each-ast.js";
import type {
  CollectionLiteral,
  CollectionTypeMember,
} from "./collection-ast.js";

export type {
  CollectionLiteral,
  CollectionTypeMember,
  ListLiteral,
  MapLiteral,
  MapLiteralEntry,
  SetLiteral,
} from "./collection-ast.js";
export type { EachBinding, EachExpression } from "./each-ast.js";

export interface Program {
  type: "Program";
  statements: Statement[];
}

export type Statement = ExpressionStatement | ImportStatement;

export interface ExpressionStatement {
  type: "ExpressionStatement";
  expression: Expression;
}

export interface ImportStatement {
  type: "ImportStatement";
  keyword: Token;
  pathToken: Token;
  path: string;
}

export type Expression =
  | IntegerLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | CollectionLiteral
  | TupleLiteral
  | AnonymousObjectLiteral
  | StructConstruction
  | VariableReference
  | AssignmentExpression
  | FunctionDeclaration
  | StructDeclaration
  | EnumDeclaration
  | FunctionCall
  | MemberCall
  | EachExpression
  | MemberAccess
  | IndexExpression
  | ReturnExpression
  | UnaryExpression
  | BinaryExpression
  | TypeInspectionExpression
  | ComparisonChainExpression
  | ConditionalExpression;

export interface IntegerLiteral {
  type: "IntegerLiteral";
  value: number;
}

export interface StringTextSegment {
  type: "Text";
  value: string;
}

export interface StringInterpolationSegment {
  type: "Interpolation";
  expression: Expression;
  token: Token;
}

export type StringSegment = StringTextSegment | StringInterpolationSegment;

export interface StringLiteral {
  type: "StringLiteral";
  segments: StringSegment[];
  token: Token;
}

export interface BooleanLiteral {
  type: "BooleanLiteral";
  value: boolean;
}

export interface NullLiteral {
  type: "NullLiteral";
}

export interface TupleLiteral {
  type: "TupleLiteral";
  members: Expression[];
}

export interface AnonymousObjectField {
  name: Token;
  value: Expression;
}

export interface AnonymousObjectLiteral {
  type: "AnonymousObjectLiteral";
  keyword: Token;
  fields: AnonymousObjectField[];
}

export interface StructConstructionField {
  name: Token;
  value: Expression;
}

export interface StructConstruction {
  type: "StructConstruction";
  constructor: Token;
  fields: StructConstructionField[];
}

export interface VariableReference {
  type: "VariableReference";
  name: string;
  token: Token;
}

export interface VariableAssignmentExpression {
  type: "AssignmentExpression";
  name: string;
  value: Expression;
}

export interface MemberAssignmentExpression {
  type: "AssignmentExpression";
  target: MemberAccess;
  value: Expression;
}

export type AssignmentExpression =
  VariableAssignmentExpression | MemberAssignmentExpression;

export type BuiltInTypeName =
  | "int"
  | "bool"
  | "str"
  | "list"
  | "set"
  | "map"
  | "collection"
  | "any"
  | "null";

export interface NamedTypeMember {
  type: "NamedType";
  lexeme: string;
  token: Token;
}

export interface TupleTypeMember {
  type: "TupleType";
  lexeme: "tuple";
  token: Token;
  members: TypeAnnotation[];
}

export type TypeMember =
  NamedTypeMember | TupleTypeMember | CollectionTypeMember;

export interface TypeAnnotation {
  members: TypeMember[];
}

export interface FunctionDeclaration {
  type: "FunctionDeclaration";
  keyword: Token;
  name: Token;
  parameters: Token[];
  parameterTypes?: (TypeAnnotation | null)[];
  parameterDefaults: (Expression | null)[];
  returnType?: TypeAnnotation;
  expressions: Expression[];
}

export interface StructFieldDeclaration {
  name: Token;
  fieldType: TypeAnnotation;
  defaultValue: Expression | null;
}

export interface StructDeclaration {
  type: "StructDeclaration";
  keyword: Token;
  name: Token;
  fields: StructFieldDeclaration[];
  methods: FunctionDeclaration[];
}

export interface EnumDeclaration {
  type: "EnumDeclaration";
  keyword: Token;
  name: Token;
  members: Token[];
}

export interface FunctionCall {
  type: "FunctionCall";
  callee: string;
  calleeToken: Token;
  arguments: Expression[];
  argumentNames: (Token | null)[];
}

export interface IndexExpression {
  type: "IndexExpression";
  target: Expression;
  index: Expression;
  bracket: Token;
}

export interface MemberAccess {
  type: "MemberAccess";
  receiver: Expression;
  member: Token;
}

export interface MemberCall {
  type: "MemberCall";
  receiver: Expression;
  member: Token;
  arguments: Expression[];
  argumentNames: (Token | null)[];
}

export interface ReturnExpression {
  type: "ReturnExpression";
  keyword: Token;
  value: Expression | null;
}

export interface UnaryExpression {
  type: "UnaryExpression";
  operator: Token;
  operand: Expression;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  left: Expression;
  operator: Token;
  right: Expression;
}

export interface TypeInspectionExpression {
  type: "TypeInspectionExpression";
  value: Expression;
  operator: Token;
  inspectedType: TypeAnnotation;
}

export interface ComparisonChainExpression {
  type: "ComparisonChainExpression";
  operands: Expression[];
  operators: Token[];
}

export interface ConditionalBranch {
  keyword: Token;
  condition: Expression;
  expressions: Expression[];
}

export interface ConditionalExpression {
  type: "ConditionalExpression";
  branches: ConditionalBranch[];
  elseKeyword: Token | null;
  elseExpressions: Expression[] | null;
}
