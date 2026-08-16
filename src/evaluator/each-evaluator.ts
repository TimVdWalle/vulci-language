// Phase 17

import { EachBinding, EachExpression } from "../ast.js";
import { createStringValue, graphemesOf } from "../graphemes.js";
import { RuntimeValue } from "../runtime-value.js";
import { StructEvaluator } from "./struct-evaluator.js";
import { copyRuntimeValue } from "./value-copy.js";

export abstract class EachEvaluator extends StructEvaluator {
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
    this.assertBindingsAvailable(expression.bindings);

    const bindingScope = this.eachBindingScope();

    for (const binding of expression.bindings) {
      bindingScope.set(binding.name.lexeme, binding);
    }

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
    } finally {
      for (const binding of expression.bindings) {
        this.deleteEachBindingValue(binding.name.lexeme);
        bindingScope.delete(binding.name.lexeme);
      }
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

  private assertBindingsAvailable(bindings: EachBinding[]): void {
    const bindingScope = this.eachBindingScope();
    const names = new Set<string>();

    for (const binding of bindings) {
      const name = binding.name.lexeme;
      const visibleValue = this.findValue(this.currentEnvironment, name);
      const visibleLocal =
        visibleValue !== undefined &&
        (this.currentEnvironment !== this.environment ||
          visibleValue.type !== "NativeFunction");

      if (
        name === "self" ||
        names.has(name) ||
        bindingScope.has(name) ||
        visibleLocal
      ) {
        throw new Error(
          `Each binding '${name}' conflicts with an already-visible binding. ` +
            `at ${binding.name.line}:${binding.name.column}`,
        );
      }

      names.add(name);
    }
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
      this.defineEachBindingValue(
        binding.name.lexeme,
        copyRuntimeValue(values[index]!),
      );
    }

    this.evaluateExpressionBlock(expression.expressions);
  }
}
