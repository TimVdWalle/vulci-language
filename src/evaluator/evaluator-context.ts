// Phase 17

import {
  EnumDeclaration,
  Expression,
  FunctionDeclaration,
  StructDeclaration,
  TypeAnnotation,
} from "../ast.js";
import { Environment } from "../environment.js";
import type { EachBinding } from "../each-ast.js";
import { RuntimeValue, StructValue } from "../runtime-value.js";

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
  private readonly eachBindings = new WeakMap<
    Environment,
    Map<string, EachBinding>
  >();
  private readonly eachValues = new WeakMap<
    Environment,
    Map<string, RuntimeValue>
  >();

  constructor(protected readonly environment: Environment) {
    this.currentEnvironment = environment;
  }

  protected eachBindingScope(): Map<string, EachBinding> {
    let bindings = this.eachBindings.get(this.currentEnvironment);

    if (bindings === undefined) {
      bindings = new Map<string, EachBinding>();
      this.eachBindings.set(this.currentEnvironment, bindings);
    }

    return bindings;
  }

  protected eachBindingValue(name: string): RuntimeValue | undefined {
    return this.eachValues.get(this.currentEnvironment)?.get(name);
  }

  protected defineEachBindingValue(name: string, value: RuntimeValue): void {
    let values = this.eachValues.get(this.currentEnvironment);

    if (values === undefined) {
      values = new Map<string, RuntimeValue>();
      this.eachValues.set(this.currentEnvironment, values);
    }

    values.set(name, value);
  }

  protected deleteEachBindingValue(name: string): void {
    this.eachValues.get(this.currentEnvironment)?.delete(name);
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
