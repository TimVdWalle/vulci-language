// Phase 16

import { MemberCall, StringLiteral } from "../ast.js";
import {
  FALSE_VALUE,
  IntegerValue,
  RuntimeValue,
  StringValue,
  TRUE_VALUE,
} from "../runtime-value.js";
import { createStringValue, graphemesOf } from "../graphemes.js";
import { CollectionEvaluator } from "./collection-evaluator.js";

export abstract class StringEvaluator extends CollectionEvaluator {
  protected evaluateStringLiteral(expression: StringLiteral): StringValue {
    let value = "";

    for (const segment of expression.segments) {
      if (segment.type === "Text") {
        value += segment.value;
        continue;
      }

      const result = this.evaluateExpression(segment.expression);

      switch (result.type) {
        case "String":
          value += result.value;
          break;
        case "Integer":
          value += result.value.toString();
          break;
        case "Boolean":
          value += result.value ? "true" : "false";
          break;
        case "Enum":
          value += result.memberName;
          break;
        default:
          throw new Error(
            "E_IPL_TYPE: Interpolation result must be str, int, bool, or " +
              "an enum value. " +
              `at ${segment.token.line}:${segment.token.column}`,
          );
      }
    }

    return createStringValue(value);
  }

  protected evaluateStringMemberCall(
    expression: MemberCall,
    receiver: StringValue,
  ): RuntimeValue {
    const arguments_ = expression.arguments.map((argument) =>
      this.evaluateExpression(argument),
    );

    switch (expression.member.lexeme) {
      case "contains": {
        this.requireMemberArgumentCount(expression, arguments_.length, 1);
        this.requireNamedMemberArgument(expression, 0, "value");
        const argument = arguments_[0]!;

        if (argument.type !== "String") {
          throw new Error(
            "E_ARG_TYPE: Member 'contains' expects a str argument. at " +
              `${expression.member.line}:${expression.member.column}`,
          );
        }

        return receiver.value.includes(argument.value)
          ? TRUE_VALUE
          : FALSE_VALUE;
      }

      case "count": {
        this.requireMemberArgumentCount(expression, arguments_.length, 0);
        const count = graphemesOf(receiver).length;
        const result: IntegerValue = { type: "Integer", value: count };

        return result;
      }

      default:
        throw new Error(
          `E_MEM_UNKNOWN: Unknown string member '${expression.member.lexeme}'. ` +
            `at ${expression.member.line}:${expression.member.column}`,
        );
    }
  }

  private requireMemberArgumentCount(
    expression: MemberCall,
    received: number,
    expected: number,
  ): void {
    if (received === expected) return;

    throw new Error(
      `E_ARG_COUNT: Member '${expression.member.lexeme}' expects ${expected} ` +
        `argument${expected === 1 ? "" : "s"}, but received ${received}. ` +
        `at ${expression.member.line}:${expression.member.column}`,
    );
  }

  private requireNamedMemberArgument(
    expression: MemberCall,
    index: number,
    expectedName: string,
  ): void {
    const name = expression.argumentNames[index];

    if (name === null || name === undefined || name.lexeme === expectedName) {
      return;
    }

    throw new Error(
      `Member '${expression.member.lexeme}' has no parameter named ` +
        `'${name.lexeme}'. at ${name.line}:${name.column}`,
    );
  }
}
