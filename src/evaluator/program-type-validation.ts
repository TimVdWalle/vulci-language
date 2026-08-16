// Phase 17

import {
  Expression,
  FunctionDeclaration,
  Program,
  TypeAnnotation,
} from "../ast.js";

export function collectProgramTypeAnnotations(
  program: Program,
): TypeAnnotation[] {
  return program.statements.flatMap((statement) =>
    statement.type === "ExpressionStatement"
      ? collectExpressionTypeAnnotations(statement.expression)
      : [],
  );
}

function collectFunctionTypeAnnotations(
  declaration: FunctionDeclaration,
): TypeAnnotation[] {
  return [
    ...(declaration.parameterTypes?.flatMap((annotation) =>
      annotation === null ? [] : [annotation],
    ) ?? []),
    ...(declaration.returnType === undefined ? [] : [declaration.returnType]),
    ...declaration.parameterDefaults.flatMap((expression) =>
      expression === null ? [] : collectExpressionTypeAnnotations(expression),
    ),
    ...declaration.expressions.flatMap(collectExpressionTypeAnnotations),
  ];
}

function collectExpressionTypeAnnotations(
  expression: Expression,
): TypeAnnotation[] {
  switch (expression.type) {
    case "TypeInspectionExpression":
      return [
        expression.inspectedType,
        ...collectExpressionTypeAnnotations(expression.value),
      ];

    case "FunctionDeclaration":
      return collectFunctionTypeAnnotations(expression);

    case "StructDeclaration":
      return [
        ...expression.fields.flatMap((field) => [
          field.fieldType,
          ...(field.defaultValue === null
            ? []
            : collectExpressionTypeAnnotations(field.defaultValue)),
        ]),
        ...expression.methods.flatMap(collectFunctionTypeAnnotations),
      ];

    case "AssignmentExpression":
      return [
        ...("target" in expression
          ? collectExpressionTypeAnnotations(expression.target.receiver)
          : []),
        ...collectExpressionTypeAnnotations(expression.value),
      ];

    case "UnaryExpression":
      return collectExpressionTypeAnnotations(expression.operand);

    case "BinaryExpression":
      return [
        ...collectExpressionTypeAnnotations(expression.left),
        ...collectExpressionTypeAnnotations(expression.right),
      ];

    case "ComparisonChainExpression":
      return expression.operands.flatMap(collectExpressionTypeAnnotations);

    case "ConditionalExpression":
      return [
        ...expression.branches.flatMap((branch) => [
          ...collectExpressionTypeAnnotations(branch.condition),
          ...branch.expressions.flatMap(collectExpressionTypeAnnotations),
        ]),
        ...(expression.elseExpressions?.flatMap(
          collectExpressionTypeAnnotations,
        ) ?? []),
      ];

    case "FunctionCall":
      return expression.arguments.flatMap(collectExpressionTypeAnnotations);

    case "MemberCall":
      return [
        ...collectExpressionTypeAnnotations(expression.receiver),
        ...expression.arguments.flatMap(collectExpressionTypeAnnotations),
      ];

    case "MemberAccess":
      return collectExpressionTypeAnnotations(expression.receiver);

    case "EachExpression":
      return [
        ...collectExpressionTypeAnnotations(expression.receiver),
        ...expression.bindings.flatMap((binding) =>
          binding.bindingType === null ? [] : [binding.bindingType],
        ),
        ...expression.expressions.flatMap(collectExpressionTypeAnnotations),
      ];

    case "IndexExpression":
      return [
        ...collectExpressionTypeAnnotations(expression.target),
        ...collectExpressionTypeAnnotations(expression.index),
      ];

    case "AnonymousObjectLiteral":
    case "StructConstruction":
      return expression.fields.flatMap((field) =>
        collectExpressionTypeAnnotations(field.value),
      );

    case "ListLiteral":
    case "SetLiteral":
      return expression.items.flatMap(collectExpressionTypeAnnotations);

    case "MapLiteral":
      return expression.entries.flatMap((entry) => [
        ...collectExpressionTypeAnnotations(entry.key),
        ...collectExpressionTypeAnnotations(entry.value),
      ]);

    case "TupleLiteral":
      return expression.members.flatMap(collectExpressionTypeAnnotations);

    case "StringLiteral":
      return expression.segments.flatMap((segment) =>
        segment.type === "Interpolation"
          ? collectExpressionTypeAnnotations(segment.expression)
          : [],
      );

    case "ReturnExpression":
      return expression.value === null
        ? []
        : collectExpressionTypeAnnotations(expression.value);

    case "EnumDeclaration":
    case "IntegerLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "VariableReference":
      return [];
  }
}
