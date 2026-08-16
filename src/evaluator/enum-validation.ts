// Phase 17

import { Expression, Program } from "../ast.js";
import { Token } from "../token.js";

export interface EnumBindingConflict {
  name: string;
  token: Token | null;
}

export function findEnumBindingConflict(
  program: Program,
  enumNames: ReadonlySet<string>,
): EnumBindingConflict | null {
  for (const statement of program.statements) {
    if (statement.type === "ImportStatement") continue;

    const conflict = findExpressionConflict(statement.expression, enumNames);

    if (conflict !== null) return conflict;
  }

  return null;
}

function findExpressionConflict(
  expression: Expression,
  enumNames: ReadonlySet<string>,
): EnumBindingConflict | null {
  switch (expression.type) {
    case "AssignmentExpression":
      if ("name" in expression && enumNames.has(expression.name)) {
        return { name: expression.name, token: null };
      }

      if ("target" in expression) {
        return (
          findExpressionConflict(expression.target.receiver, enumNames) ??
          findExpressionConflict(expression.value, enumNames)
        );
      }

      return findExpressionConflict(expression.value, enumNames);

    case "FunctionDeclaration": {
      const parameter = expression.parameters.find((candidate) =>
        enumNames.has(candidate.lexeme),
      );

      if (parameter !== undefined) {
        return { name: parameter.lexeme, token: parameter };
      }

      for (const defaultValue of expression.parameterDefaults) {
        if (defaultValue === null) continue;
        const conflict = findExpressionConflict(defaultValue, enumNames);
        if (conflict !== null) return conflict;
      }

      return findExpressionListConflict(expression.expressions, enumNames);
    }

    case "StructDeclaration":
      for (const field of expression.fields) {
        if (field.defaultValue === null) continue;
        const conflict = findExpressionConflict(field.defaultValue, enumNames);
        if (conflict !== null) return conflict;
      }

      for (const method of expression.methods) {
        const conflict = findExpressionConflict(method, enumNames);
        if (conflict !== null) return conflict;
      }

      return null;

    case "EnumDeclaration":
      return null;

    case "UnaryExpression":
      return findExpressionConflict(expression.operand, enumNames);

    case "BinaryExpression":
      return (
        findExpressionConflict(expression.left, enumNames) ??
        findExpressionConflict(expression.right, enumNames)
      );

    case "TypeInspectionExpression":
      return findExpressionConflict(expression.value, enumNames);

    case "ComparisonChainExpression":
      return findExpressionListConflict(expression.operands, enumNames);

    case "ConditionalExpression":
      for (const branch of expression.branches) {
        const conflict =
          findExpressionConflict(branch.condition, enumNames) ??
          findExpressionListConflict(branch.expressions, enumNames);
        if (conflict !== null) return conflict;
      }

      return expression.elseExpressions === null
        ? null
        : findExpressionListConflict(expression.elseExpressions, enumNames);

    case "FunctionCall":
      return findExpressionListConflict(expression.arguments, enumNames);

    case "MemberCall":
      return (
        findExpressionConflict(expression.receiver, enumNames) ??
        findExpressionListConflict(expression.arguments, enumNames)
      );

    case "MemberAccess":
      return findExpressionConflict(expression.receiver, enumNames);

    case "EachExpression": {
      const binding = expression.bindings.find((candidate) =>
        enumNames.has(candidate.name.lexeme),
      );

      if (binding !== undefined) {
        return { name: binding.name.lexeme, token: binding.name };
      }

      return (
        findExpressionConflict(expression.receiver, enumNames) ??
        findExpressionListConflict(expression.expressions, enumNames)
      );
    }

    case "IndexExpression":
      return (
        findExpressionConflict(expression.target, enumNames) ??
        findExpressionConflict(expression.index, enumNames)
      );

    case "AnonymousObjectLiteral":
    case "StructConstruction":
      return findExpressionListConflict(
        expression.fields.map((field) => field.value),
        enumNames,
      );

    case "ListLiteral":
    case "SetLiteral":
      return findExpressionListConflict(expression.items, enumNames);

    case "MapLiteral":
      return findExpressionListConflict(
        expression.entries.flatMap((entry) => [entry.key, entry.value]),
        enumNames,
      );

    case "TupleLiteral":
      return findExpressionListConflict(expression.members, enumNames);

    case "StringLiteral":
      return findExpressionListConflict(
        expression.segments.flatMap((segment) =>
          segment.type === "Interpolation" ? [segment.expression] : [],
        ),
        enumNames,
      );

    case "ReturnExpression":
      return expression.value === null
        ? null
        : findExpressionConflict(expression.value, enumNames);

    case "IntegerLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "VariableReference":
      return null;
  }
}

function findExpressionListConflict(
  expressions: Expression[],
  enumNames: ReadonlySet<string>,
): EnumBindingConflict | null {
  for (const expression of expressions) {
    const conflict = findExpressionConflict(expression, enumNames);
    if (conflict !== null) return conflict;
  }

  return null;
}
