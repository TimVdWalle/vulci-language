// Phase 18

import { EachExpression } from "../ast.js";
import { createStringValue, graphemesOf } from "../graphemes.js";
import { RuntimeValue } from "../runtime-value.js";
import { BreakSignal } from "./break-signal.js";
import { ActiveLoopBinding } from "./evaluator-context.js";
import { LoopEvaluator } from "./loop-evaluator.js";
import { copyRuntimeValue } from "./value-copy.js";

export abstract class EachEvaluator extends LoopEvaluator {
  protected evaluateEachExpression(expression: EachExpression): RuntimeValue {
    const receiver = this.evaluateExpression(expression.receiver);
    const location = `${expression.keyword.line}:${expression.keyword.column}`;

    if (
      receiver.type !== "String" &&
      receiver.type !== "List" &&
      receiver.type !== "Set" &&
      receiver.type !== "Map"
    ) {
      throw new Error(
        `E_MEM_TYPE: Type '${this.runtimeTypeName(receiver)}' does not support ` +
          `member 'each'. at ${location}`,
      );
    }

    this.assertBindingCount(expression, receiver);
    const activeBindings: ActiveLoopBinding[] = expression.bindings.map(
      (binding) => ({ ...binding, kind: "each" }),
    );
    this.activateLoopBindings(activeBindings);

    try {
      if (receiver.type === "String") {
        for (const grapheme of graphemesOf(receiver)) {
          this.evaluateEachBody(expression, [createStringValue(grapheme)]);
        }
      } else if (receiver.type === "Map") {
        for (const entry of receiver.entries) {
          this.evaluateEachBody(expression, [entry.value, entry.key]);
        }
      } else {
        for (const item of receiver.items) {
          this.evaluateEachBody(expression, [item]);
        }
      }
    } catch (error) {
      if (!(error instanceof BreakSignal)) throw error;
    } finally {
      this.deactivateLoopBindings(activeBindings);
    }

    return receiver;
  }

  private assertBindingCount(
    expression: EachExpression,
    receiver: RuntimeValue,
  ): void {
    const count = expression.bindings.length;
    const valid =
      receiver.type === "Map" ? count === 1 || count === 2 : count === 1;

    if (valid) return;

    const expected = receiver.type === "Map" ? "one or two" : "exactly one";
    throw new Error(
      `Each on type '${this.runtimeTypeName(receiver)}' requires ${expected} ` +
        `binding${receiver.type === "Map" ? "s" : ""}, but received ${count}. ` +
        `at ${expression.keyword.line}:${expression.keyword.column}`,
    );
  }

  private evaluateEachBody(
    expression: EachExpression,
    values: RuntimeValue[],
  ): void {
    for (let index = 0; index < expression.bindings.length; index++) {
      const binding = expression.bindings[index]!;
      const value = values[index]!;

      if (
        binding.bindingType !== null &&
        !this.valueMatchesType(value, binding.bindingType)
      ) {
        throw new Error(
          `Each binding '${binding.name.lexeme}' expects ` +
            `${this.typeAnnotationName(binding.bindingType)}, but received ` +
            `${this.runtimeTypeName(value)}. at ${binding.name.line}:` +
            `${binding.name.column}`,
        );
      }
    }

    for (let index = 0; index < expression.bindings.length; index++) {
      const binding = expression.bindings[index]!;
      this.defineLoopBindingValue(
        binding.name.lexeme,
        copyRuntimeValue(values[index]!),
      );
    }

    this.evaluateExpressionBlock(expression.expressions);
  }
}
