// Phase 16

import { Expression } from "../ast.js";
import {
  FALSE_VALUE,
  IntegerValue,
  RuntimeValue,
  TRUE_VALUE,
} from "../runtime-value.js";
import { Token, TokenType } from "../token.js";
import { createStringValue } from "../graphemes.js";
import { ComparisonEvaluator } from "./comparison-evaluator.js";
import { runtimeValuesEqual } from "./runtime-equality.js";

export abstract class OperatorEvaluator extends ComparisonEvaluator {
  protected evaluateUnaryExpression(
    operator: Token,
    operand: RuntimeValue,
  ): RuntimeValue {
    switch (operator.type) {
      case TokenType.Minus: {
        const integer = this.requireInteger(operand, operator);

        return this.createInteger(-integer.value, operator);
      }

      case TokenType.Not:
        if (operand.type !== "Boolean") {
          throw new Error(
            `Operator 'not' requires a boolean operand, but ` +
              `the operand is ${this.runtimeTypeName(operand)}. ` +
              `at ${operator.line}:${operator.column}`,
          );
        }

        return this.createBoolean(!operand.value);

      default:
        throw new Error(
          `Unsupported unary operator '${operator.lexeme}' at ` +
            `${operator.line}:${operator.column}`,
        );
    }
  }

  protected evaluateLogicalExpression(
    operator: Token,
    leftExpression: Expression,
    rightExpression: Expression,
  ): RuntimeValue {
    const left = this.evaluateExpression(leftExpression);

    if (left.type !== "Boolean") {
      throw new Error(
        `Operator '${operator.lexeme}' requires boolean operands, ` +
          `but the left operand is ${this.runtimeTypeName(left)}. ` +
          `at ${operator.line}:${operator.column}`,
      );
    }

    if (operator.type === TokenType.And && !left.value) {
      return FALSE_VALUE;
    }

    if (operator.type === TokenType.Or && left.value) {
      return TRUE_VALUE;
    }

    const right = this.evaluateExpression(rightExpression);

    if (right.type !== "Boolean") {
      throw new Error(
        `Operator '${operator.lexeme}' requires boolean operands, ` +
          `but the right operand is ${this.runtimeTypeName(right)}. ` +
          `at ${operator.line}:${operator.column}`,
      );
    }

    switch (operator.type) {
      case TokenType.And:
        return this.createBoolean(left.value && right.value);

      case TokenType.Or:
        return this.createBoolean(left.value || right.value);

      default:
        throw new Error(
          `Unsupported logical operator '${operator.lexeme}' at ` +
            `${operator.line}:${operator.column}`,
        );
    }
  }

  protected evaluateBinaryExpression(
    operator: Token,
    left: RuntimeValue,
    right: RuntimeValue,
  ): RuntimeValue {
    switch (operator.type) {
      case TokenType.EqualEqual:
        return this.createBoolean(this.valuesEqual(left, right, operator));

      case TokenType.BangEqual:
        return this.createBoolean(!this.valuesEqual(left, right, operator));

      case TokenType.Less:
      case TokenType.LessEqual:
      case TokenType.Greater:
      case TokenType.GreaterEqual:
        return this.evaluateOrderingComparison(operator, left, right);
    }

    if (operator.type === TokenType.Plus || operator.type === TokenType.Tilde) {
      if (left.type === "String" && right.type === "String") {
        return createStringValue(
          operator.type === TokenType.Plus
            ? left.value + right.value
            : `${left.value} ${right.value}`,
        );
      }

      if (operator.type === TokenType.Tilde) {
        throw new Error(
          `Operator '~' requires string operands. at ` +
            `${operator.line}:${operator.column}`,
        );
      }
    }

    const leftInteger = this.requireInteger(left, operator);
    const rightInteger = this.requireInteger(right, operator);

    let result: number;

    switch (operator.type) {
      case TokenType.Plus:
        result = leftInteger.value + rightInteger.value;
        break;

      case TokenType.Minus:
        result = leftInteger.value - rightInteger.value;
        break;

      case TokenType.Star:
        result = leftInteger.value * rightInteger.value;
        break;

      case TokenType.Slash:
        if (rightInteger.value === 0) {
          throw new Error(
            `Division by zero at ${operator.line}:${operator.column}`,
          );
        }

        result = Math.trunc(leftInteger.value / rightInteger.value);
        break;

      case TokenType.Percent:
        if (rightInteger.value === 0) {
          throw new Error(
            `Remainder by zero at ${operator.line}:${operator.column}`,
          );
        }

        result = leftInteger.value % rightInteger.value;
        break;

      default:
        throw new Error(
          `Unsupported binary operator '${operator.lexeme}' at ` +
            `${operator.line}:${operator.column}`,
        );
    }

    return this.createInteger(result, operator);
  }

  protected valuesEqual(
    left: RuntimeValue,
    right: RuntimeValue,
    operator: Token,
  ): boolean {
    try {
      return runtimeValuesEqual(left, right);
    } catch {
      throw new Error(
        `Operator '${operator.lexeme}' requires operands ` +
          `of the same type. at ` +
          `${operator.line}:${operator.column}`,
      );
    }
  }

  protected evaluateOrderingComparison(
    operator: Token,
    left: RuntimeValue,
    right: RuntimeValue,
  ): RuntimeValue {
    if (!(
      (left.type === "Integer" && right.type === "Integer") ||
      (left.type === "String" && right.type === "String")
    )) {
      throw new Error(
        `Operator '${operator.lexeme}' requires two integers or two strings. at ` +
          `${operator.line}:${operator.column}`,
      );
    }

    switch (operator.type) {
      case TokenType.Less:
        return this.createBoolean(left.value < right.value);

      case TokenType.LessEqual:
        return this.createBoolean(left.value <= right.value);

      case TokenType.Greater:
        return this.createBoolean(left.value > right.value);

      case TokenType.GreaterEqual:
        return this.createBoolean(left.value >= right.value);

      default:
        throw new Error(
          `Unsupported ordering operator '${operator.lexeme}' at ` +
            `${operator.line}:${operator.column}`,
        );
    }
  }

  protected createBoolean(
    value: boolean,
  ): typeof TRUE_VALUE | typeof FALSE_VALUE {
    return value ? TRUE_VALUE : FALSE_VALUE;
  }

  protected requireInteger(value: RuntimeValue, operator: Token): IntegerValue {
    if (value.type !== "Integer") {
      throw new Error(
        `Operator '${operator.lexeme}' requires Integer operands at ` +
          `${operator.line}:${operator.column}`,
      );
    }

    return value;
  }

  protected createInteger(value: number, operator: Token): IntegerValue {
    if (!Number.isSafeInteger(value)) {
      throw new Error(
        `Integer arithmetic result is outside the supported range at ` +
          `${operator.line}:${operator.column}`,
      );
    }

    return {
      type: "Integer",
      value,
    };
  }
}
