// Phase 16

import {
  ConditionalExpression,
  Expression,
  ExpressionStatement,
  VariableReference,
} from "../ast.js";
import {
  FALSE_VALUE,
  IntegerValue,
  NULL_VALUE,
  RuntimeValue,
  TRUE_VALUE,
} from "../runtime-value.js";
import { TokenType } from "../token.js";
import { FunctionEvaluator } from "./function-evaluator.js";
import { ReturnSignal } from "./return-signal.js";

export abstract class ExpressionEvaluator extends FunctionEvaluator {
  protected evaluateStatement(statement: ExpressionStatement): RuntimeValue {
    return this.evaluateExpression(statement.expression);
  }

  protected evaluateExpression(expression: Expression): RuntimeValue {
    switch (expression.type) {
      case "StringLiteral":
        return this.evaluateStringLiteral(expression);

      case "IntegerLiteral": {
        const value: IntegerValue = {
          type: "Integer",
          value: expression.value,
        };

        return value;
      }

      case "BooleanLiteral":
        return expression.value ? TRUE_VALUE : FALSE_VALUE;

      case "NullLiteral":
        return NULL_VALUE;

      case "ListLiteral":
      case "SetLiteral":
      case "MapLiteral":
        return this.evaluateCollectionLiteral(expression);

      case "AnonymousObjectLiteral":
        return {
          type: "AnonymousObject",
          fields: expression.fields.map((field) => ({
            name: field.name.lexeme,
            value: this.evaluateExpression(field.value),
          })),
        };

      case "StructConstruction":
        return this.evaluateStructConstruction(expression);

      case "TupleLiteral":
        return {
          type: "Tuple",
          members: expression.members.map((member) =>
            this.evaluateExpression(member),
          ),
        };

      case "VariableReference":
        return this.evaluateBareIdentifier(expression);

      case "AssignmentExpression":
        if ("target" in expression) {
          return this.evaluateMemberAssignment(
            expression.target,
            expression.value,
          );
        }

        if (expression.name === "self") {
          const code =
            this.currentSelf === null ? "E_SELF_CONTEXT" : "E_SELF_ASSIGN";
          const message =
            this.currentSelf === null
              ? "'self' can only be used inside a struct method."
              : "The 'self' binding cannot be reassigned.";

          throw new Error(`${code}: ${message}`);
        }

        {
          const value = this.evaluateExpression(expression.value);
          this.assignVariable(expression.name, value);
          return value;
        }

      case "FunctionDeclaration":
      case "StructDeclaration":
      case "EnumDeclaration":
        return NULL_VALUE;

      case "FunctionCall":
        return this.evaluateFunctionCall(expression);

      case "MemberAccess":
        return this.evaluateMemberAccess(expression);

      case "MemberCall":
        return this.evaluateMemberCall(expression);

      case "IndexExpression":
        return this.evaluateIndexExpression(expression);

      case "ReturnExpression": {
        if (this.functionDepth === 0) {
          throw new Error(
            `'return' can only be used inside a function. at ` +
              `${expression.keyword.line}:${expression.keyword.column}`,
          );
        }

        const value =
          expression.value === null
            ? NULL_VALUE
            : this.evaluateExpression(expression.value);

        throw new ReturnSignal(value);
      }

      case "UnaryExpression":
        return this.evaluateUnaryExpression(
          expression.operator,
          this.evaluateExpression(expression.operand),
        );

      case "BinaryExpression":
        if (
          expression.operator.type === TokenType.And ||
          expression.operator.type === TokenType.Or
        ) {
          return this.evaluateLogicalExpression(
            expression.operator,
            expression.left,
            expression.right,
          );
        }

        return this.evaluateBinaryExpression(
          expression.operator,
          this.evaluateExpression(expression.left),
          this.evaluateExpression(expression.right),
        );

      case "TypeInspectionExpression":
        return this.createBoolean(
          this.valueMatchesType(
            this.evaluateExpression(expression.value),
            expression.inspectedType,
          ),
        );

      case "ComparisonChainExpression":
        return this.evaluateComparisonChain(expression);

      case "ConditionalExpression":
        return this.evaluateConditionalExpression(expression);
    }
  }

  protected evaluateBareIdentifier(
    expression: VariableReference,
  ): RuntimeValue {
    if (expression.name === "self") {
      if (this.currentSelf === null) {
        throw new Error(
          `E_SELF_CONTEXT: 'self' can only be used inside a struct method. at ` +
            `${expression.token.line}:${expression.token.column}`,
        );
      }

      return this.currentSelf;
    }

    if (this.enums.has(expression.name)) {
      throw new Error(
        `Enum '${expression.name}' must be accessed through a qualified ` +
          `member. at ${expression.token.line}:${expression.token.column}`,
      );
    }

    if (expression.name.startsWith("$")) {
      return this.environment.get(expression.name);
    }

    const localValue = this.findValue(this.currentEnvironment, expression.name);

    if (localValue !== undefined) {
      if (localValue.type === "NativeFunction") {
        return this.callNativeFunction(localValue, {
          type: "FunctionCall",
          callee: expression.name,
          calleeToken: expression.token,
          arguments: [],
          argumentNames: [],
        });
      }

      return localValue;
    }

    if (this.currentEnvironment !== this.environment) {
      const globalValue = this.findValue(this.environment, expression.name);

      if (globalValue !== undefined) {
        if (globalValue.type === "NativeFunction") {
          return this.callNativeFunction(globalValue, {
            type: "FunctionCall",
            callee: expression.name,
            calleeToken: expression.token,
            arguments: [],
            argumentNames: [],
          });
        }

        if (this.defaultEvaluationContext === null) return globalValue;
      }
    }

    const declaration = this.functions.get(expression.name);

    if (declaration !== undefined) {
      return this.callFunction(declaration, {
        type: "FunctionCall",
        callee: expression.name,
        calleeToken: expression.token,
        arguments: [],
        argumentNames: [],
      });
    }

    throw new Error(
      `Undefined variable '${expression.name}'. at ` +
        `${expression.token.line}:${expression.token.column}`,
    );
  }

  protected evaluateConditionalExpression(
    expression: ConditionalExpression,
  ): RuntimeValue {
    for (const branch of expression.branches) {
      const condition = this.evaluateExpression(branch.condition);

      if (condition.type !== "Boolean") {
        throw new Error(
          "Conditional expression requires a Boolean condition. " +
            `at ${branch.keyword.line}:${branch.keyword.column}`,
        );
      }

      if (condition.value) {
        return this.evaluateExpressionBlock(branch.expressions);
      }
    }

    if (expression.elseExpressions !== null) {
      return this.evaluateExpressionBlock(expression.elseExpressions);
    }

    return NULL_VALUE;
  }

  protected evaluateExpressionBlock(expressions: Expression[]): RuntimeValue {
    let result: RuntimeValue = NULL_VALUE;

    for (const expression of expressions) {
      result = this.evaluateExpression(expression);
    }

    return result;
  }
}
