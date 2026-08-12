// Phase 15

import {
  Expression,
  Program,
  StructDeclaration,
  TypeAnnotation,
} from "../ast.js";
import { Token } from "../token.js";

export interface StructBindingConflict {
  name: string;
  token: Token | null;
}

interface StructEdge {
  target: string;
  field: Token;
}

export function findStructBindingConflict(
  program: Program,
  structNames: ReadonlySet<string>,
): StructBindingConflict | null {
  for (const statement of program.statements) {
    if (statement.type === "ImportStatement") continue;

    const conflict = findExpressionConflict(statement.expression, structNames);

    if (conflict !== null) return conflict;
  }

  return null;
}

export function validateStructRecursion(
  structs: ReadonlyMap<string, StructDeclaration>,
): void {
  const graph = new Map<string, StructEdge[]>();

  for (const declaration of structs.values()) {
    const edges: StructEdge[] = [];

    for (const field of declaration.fields) {
      collectStructEdges(field.fieldType, structs, false, field.name, edges);
    }

    graph.set(declaration.name.lexeme, edges);
  }

  const state = new Map<string, "visiting" | "visited">();

  const visit = (name: string): void => {
    state.set(name, "visiting");

    for (const edge of graph.get(name) ?? []) {
      const targetState = state.get(edge.target);

      if (targetState === "visiting") {
        throw new Error(
          "E_STRUCT_RECURSION: Recursive struct cycle through field " +
            `'${edge.field.lexeme}' requires an explicitly nullable field. ` +
            `at ${edge.field.line}:${edge.field.column}`,
        );
      }

      if (targetState === undefined) visit(edge.target);
    }

    state.set(name, "visited");
  };

  for (const name of graph.keys()) {
    if (state.get(name) === undefined) visit(name);
  }
}

function collectStructEdges(
  annotation: TypeAnnotation,
  structs: ReadonlyMap<string, StructDeclaration>,
  nullableAncestor: boolean,
  field: Token,
  edges: StructEdge[],
): void {
  const nullable =
    nullableAncestor ||
    annotation.members.some(
      (member) => member.type === "NamedType" && member.lexeme === "null",
    );

  for (const member of annotation.members) {
    if (member.type === "TupleType") {
      for (const nested of member.members) {
        collectStructEdges(nested, structs, nullable, field, edges);
      }
      continue;
    }

    if (!nullable && structs.has(member.lexeme)) {
      edges.push({ target: member.lexeme, field });
    }
  }
}

function findExpressionConflict(
  expression: Expression,
  structNames: ReadonlySet<string>,
): StructBindingConflict | null {
  switch (expression.type) {
    case "AssignmentExpression":
      if ("name" in expression && structNames.has(expression.name)) {
        return { name: expression.name, token: null };
      }

      if ("target" in expression) {
        return (
          findExpressionConflict(expression.target.receiver, structNames) ??
          findExpressionConflict(expression.value, structNames)
        );
      }

      return findExpressionConflict(expression.value, structNames);

    case "FunctionDeclaration": {
      const parameter = expression.parameters.find((candidate) =>
        structNames.has(candidate.lexeme),
      );

      if (parameter !== undefined) {
        return { name: parameter.lexeme, token: parameter };
      }

      for (const defaultValue of expression.parameterDefaults) {
        if (defaultValue === null) continue;
        const conflict = findExpressionConflict(defaultValue, structNames);
        if (conflict !== null) return conflict;
      }

      return findExpressionListConflict(expression.expressions, structNames);
    }

    case "StructDeclaration":
      for (const field of expression.fields) {
        if (field.defaultValue === null) continue;
        const conflict = findExpressionConflict(
          field.defaultValue,
          structNames,
        );
        if (conflict !== null) return conflict;
      }

      for (const method of expression.methods) {
        const conflict = findExpressionConflict(method, structNames);
        if (conflict !== null) return conflict;
      }

      return null;

    case "UnaryExpression":
      return findExpressionConflict(expression.operand, structNames);

    case "BinaryExpression":
      return (
        findExpressionConflict(expression.left, structNames) ??
        findExpressionConflict(expression.right, structNames)
      );

    case "TypeInspectionExpression":
      return findExpressionConflict(expression.value, structNames);

    case "ComparisonChainExpression":
      return findExpressionListConflict(expression.operands, structNames);

    case "ConditionalExpression":
      for (const branch of expression.branches) {
        const conflict =
          findExpressionConflict(branch.condition, structNames) ??
          findExpressionListConflict(branch.expressions, structNames);
        if (conflict !== null) return conflict;
      }

      return expression.elseExpressions === null
        ? null
        : findExpressionListConflict(expression.elseExpressions, structNames);

    case "FunctionCall":
      return findExpressionListConflict(expression.arguments, structNames);

    case "MemberCall":
      return (
        findExpressionConflict(expression.receiver, structNames) ??
        findExpressionListConflict(expression.arguments, structNames)
      );

    case "MemberAccess":
      return findExpressionConflict(expression.receiver, structNames);

    case "IndexExpression":
      return (
        findExpressionConflict(expression.target, structNames) ??
        findExpressionConflict(expression.index, structNames)
      );

    case "AnonymousObjectLiteral":
    case "StructConstruction":
      return findExpressionListConflict(
        expression.fields.map((field) => field.value),
        structNames,
      );

    case "TupleLiteral":
      return findExpressionListConflict(expression.members, structNames);

    case "StringLiteral":
      return findExpressionListConflict(
        expression.segments.flatMap((segment) =>
          segment.type === "Interpolation" ? [segment.expression] : [],
        ),
        structNames,
      );

    case "ReturnExpression":
      return expression.value === null
        ? null
        : findExpressionConflict(expression.value, structNames);

    case "EnumDeclaration":
    case "IntegerLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "VariableReference":
      return null;
  }
}

function findExpressionListConflict(
  expressions: Expression[],
  structNames: ReadonlySet<string>,
): StructBindingConflict | null {
  for (const expression of expressions) {
    const conflict = findExpressionConflict(expression, structNames);
    if (conflict !== null) return conflict;
  }

  return null;
}
