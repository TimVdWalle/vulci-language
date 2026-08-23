// Phase 19

import { BreakExpression, TimesExpression, WhileExpression } from "../ast.js";
import { ENVIRONMENT_BUILTIN_NAMES } from "../builtins.js";
import { NULL_VALUE, RuntimeValue } from "../runtime-value.js";
import { BreakSignal } from "./break-signal.js";
import { ActiveLoopBinding } from "./evaluator-context.js";
import { StructEvaluator } from "./struct-evaluator.js";

export abstract class LoopEvaluator extends StructEvaluator {
  protected evaluateTimesExpression(expression: TimesExpression): RuntimeValue {
    const receiver = this.evaluateExpression(expression.receiver);
    const location = `${expression.keyword.line}:${expression.keyword.column}`;

    if (receiver.type !== "Integer") {
      throw new Error(
        `E_MEM_TYPE: Type '${this.runtimeTypeName(receiver)}' does not support ` +
          `member 'times'. at ${location}`,
      );
    }

    if (receiver.value < 0) {
      throw new Error(
        "E_TIMES_COUNT: '.times' receiver must be zero or greater. " +
          `at ${location}`,
      );
    }

    const bindings: ActiveLoopBinding[] =
      expression.binding === null
        ? []
        : [
            {
              name: expression.binding,
              bindingType: null,
              kind: "times",
            },
          ];

    this.activateLoopBindings(bindings);

    try {
      for (let index = 0; index < receiver.value; index++) {
        if (expression.binding !== null) {
          this.defineLoopBindingValue(expression.binding.lexeme, {
            type: "Integer",
            value: index,
          });
        }

        this.evaluateExpressionBlock(expression.expressions);
      }
    } catch (error) {
      if (!(error instanceof BreakSignal)) throw error;
    } finally {
      this.deactivateLoopBindings(bindings);
    }

    return receiver;
  }

  protected evaluateWhileExpression(expression: WhileExpression): RuntimeValue {
    while (true) {
      const condition = this.evaluateExpression(expression.condition);

      if (condition.type !== "Boolean") {
        throw new Error(
          "E_WHILE_COND: 'while' requires a Boolean condition. " +
            `at ${expression.keyword.line}:${expression.keyword.column}`,
        );
      }

      if (!condition.value) return NULL_VALUE;

      try {
        this.evaluateExpressionBlock(expression.expressions);
      } catch (error) {
        if (error instanceof BreakSignal) return NULL_VALUE;
        throw error;
      }
    }
  }

  protected evaluateBreakExpression(expression: BreakExpression): never {
    throw new BreakSignal(expression.keyword);
  }

  protected activateLoopBindings(bindings: ActiveLoopBinding[]): void {
    this.assertLoopBindingsAvailable(bindings);
    const bindingScope = this.loopBindingScope();

    for (const binding of bindings) {
      bindingScope.set(binding.name.lexeme, binding);
    }
  }

  protected deactivateLoopBindings(bindings: ActiveLoopBinding[]): void {
    const bindingScope = this.loopBindingScope();

    for (const binding of bindings) {
      this.deleteLoopBindingValue(binding.name.lexeme);
      bindingScope.delete(binding.name.lexeme);
    }
  }

  private assertLoopBindingsAvailable(bindings: ActiveLoopBinding[]): void {
    const bindingScope = this.loopBindingScope();
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
        ENVIRONMENT_BUILTIN_NAMES.has(name) ||
        names.has(name) ||
        bindingScope.has(name) ||
        visibleLocal
      ) {
        const label = binding.kind === "each" ? "Each" : "Times";
        throw new Error(
          `${label} binding '${name}' conflicts with an already-visible ` +
            `binding. at ${binding.name.line}:${binding.name.column}`,
        );
      }

      names.add(name);
    }
  }
}
