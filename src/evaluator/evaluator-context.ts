// Phase 18

import {
  EnumDeclaration,
  Expression,
  FunctionDeclaration,
  StructDeclaration,
  TypeAnnotation,
} from "../ast.js";
import { Environment } from "../environment.js";
import { RuntimeValue, StructValue } from "../runtime-value.js";
import { Token } from "../token.js";

export interface ActiveLoopBinding {
  name: Token;
  bindingType: TypeAnnotation | null;
  kind: "each" | "times";
}

export type DefaultEvaluationContext = "function" | "struct" | null;

export abstract class EvaluatorContext {
  protected static readonly MAX_FUNCTION_DEPTH = 1_000;

  protected readonly functions = new Map<string, FunctionDeclaration>();
  protected readonly structs = new Map<string, StructDeclaration>();
  protected readonly enums = new Map<string, EnumDeclaration>();
  protected currentEnvironment: Environment;
  protected functionDepth = 0;
  protected currentFunction: FunctionDeclaration | null = null;
  protected currentParameterTypes = new Map<string, TypeAnnotation | null>();
  protected currentSelf: StructValue | null = null;
  protected defaultEvaluationContext: DefaultEvaluationContext = null;
  private readonly loopBindings = new WeakMap<
    Environment,
    Map<string, ActiveLoopBinding>
  >();
  private readonly loopValues = new WeakMap<
    Environment,
    Map<string, RuntimeValue>
  >();

  constructor(protected readonly environment: Environment) {
    this.currentEnvironment = environment;
  }

  protected loopBindingScope(): Map<string, ActiveLoopBinding> {
    let bindings = this.loopBindings.get(this.currentEnvironment);

    if (bindings === undefined) {
      bindings = new Map<string, ActiveLoopBinding>();
      this.loopBindings.set(this.currentEnvironment, bindings);
    }

    return bindings;
  }

  protected loopBindingValue(name: string): RuntimeValue | undefined {
    return this.loopValues.get(this.currentEnvironment)?.get(name);
  }

  protected defineLoopBindingValue(name: string, value: RuntimeValue): void {
    let values = this.loopValues.get(this.currentEnvironment);

    if (values === undefined) {
      values = new Map<string, RuntimeValue>();
      this.loopValues.set(this.currentEnvironment, values);
    }

    values.set(name, value);
  }

  protected deleteLoopBindingValue(name: string): void {
    this.loopValues.get(this.currentEnvironment)?.delete(name);
  }

  protected abstract evaluateExpression(expression: Expression): RuntimeValue;
  protected abstract evaluateDefaultExpression(
    expression: Expression,
    context?: "function" | "struct",
  ): RuntimeValue;
  protected abstract evaluateExpressionBlock(
    expressions: Expression[],
  ): RuntimeValue;
}
