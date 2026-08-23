// Phase 19

import { FunctionCall, FunctionDeclaration, TypeAnnotation } from "../ast.js";
import { Environment } from "../environment.js";
import {
  NativeFunctionParameter,
  NativeFunctionValue,
  RuntimeValue,
  StructValue,
} from "../runtime-value.js";
import { ArgumentBinder } from "./argument-binder.js";
import { ReturnSignal } from "./return-signal.js";
import { copyRuntimeValue } from "./value-copy.js";

export abstract class CallExecutor extends ArgumentBinder {
  protected callNativeFunction(
    nativeFunction: NativeFunctionValue,
    callExpression: FunctionCall,
  ): RuntimeValue {
    this.assertNativeArgumentCount(nativeFunction, callExpression);

    if (nativeFunction.parameters === undefined) {
      const namedArgument = callExpression.argumentNames.find(
        (argumentName) => argumentName !== null,
      );

      if (namedArgument !== undefined && namedArgument !== null) {
        throw new Error(
          `Native function '${callExpression.callee}' does not declare ` +
            `named parameters. at ${namedArgument.line}:` +
            `${namedArgument.column}`,
        );
      }

      const arguments_ = callExpression.arguments.map((argument) =>
        this.evaluateExpression(argument),
      );

      return nativeFunction.call(arguments_, callExpression);
    }

    const boundArguments = this.bindSuppliedArguments(
      callExpression.callee,
      nativeFunction.parameters,
      callExpression,
    );

    const arguments_: RuntimeValue[] = [];

    for (let index = 0; index < boundArguments.length; index++) {
      const argument = boundArguments[index];

      if (argument !== undefined) {
        arguments_.push(argument);
        continue;
      }

      const parameter = nativeFunction.parameters[index];

      if (parameter?.omittable === true) continue;

      throw new Error(
        `Native function '${callExpression.callee}' has no value for ` +
          `parameter '${parameter?.name ?? index}'. at ` +
          `${callExpression.calleeToken.line}:` +
          `${callExpression.calleeToken.column}`,
      );
    }

    return nativeFunction.call(arguments_, callExpression);
  }

  private assertNativeArgumentCount(
    nativeFunction: NativeFunctionValue,
    callExpression: FunctionCall,
  ): void {
    if (!nativeFunction.codedArgumentCount) return;

    const minimum = nativeFunction.parameters.filter(
      (parameter) => parameter.required,
    ).length;
    const maximum = nativeFunction.parameters.length;
    const received = callExpression.arguments.length;

    if (received >= minimum && received <= maximum) return;

    const expected =
      minimum === maximum ? `${minimum}` : `${minimum} or ${maximum}`;

    throw new Error(
      `E_ARG_COUNT: Function '${callExpression.callee}' expects ${expected} ` +
        `arguments, but received ${received}. at ` +
        `${callExpression.calleeToken.line}:` +
        `${callExpression.calleeToken.column}`,
    );
  }

  protected callFunction(
    declaration: FunctionDeclaration,
    callExpression: FunctionCall,
    receiver: StructValue | null = null,
    displayName = declaration.name.lexeme,
  ): RuntimeValue {
    if (this.functionDepth >= CallExecutor.MAX_FUNCTION_DEPTH) {
      throw this.maximumDepthError(displayName, callExpression);
    }

    const parameterDefaults = declaration.parameterDefaults;
    const parameters: NativeFunctionParameter[] = declaration.parameters.map(
      (parameter, index) => ({
        name: parameter.lexeme,
        required: parameterDefaults[index] === null,
      }),
    );
    const boundArguments = this.bindSuppliedArguments(
      displayName,
      parameters,
      callExpression,
    );

    for (let index = 0; index < declaration.parameters.length; index++) {
      if (boundArguments[index] !== undefined) continue;

      const defaultExpression = parameterDefaults[index];

      if (defaultExpression === null || defaultExpression === undefined) {
        const parameter = declaration.parameters[index]!;

        throw new Error(
          `Function '${displayName}' is missing required argument ` +
            `'${parameter.lexeme}'. at ` +
            `${callExpression.calleeToken.line}:` +
            `${callExpression.calleeToken.column}`,
        );
      }

      boundArguments[index] = this.evaluateDefaultExpression(defaultExpression);
    }

    const previousEnvironment = this.currentEnvironment;
    const previousFunction = this.currentFunction;
    const previousParameterTypes = this.currentParameterTypes;
    const previousSelf = this.currentSelf;
    const previousDefaultContext = this.defaultEvaluationContext;
    const localEnvironment = new Environment();
    const parameterTypes = new Map<string, TypeAnnotation | null>();

    for (let index = 0; index < declaration.parameters.length; index++) {
      const parameter = declaration.parameters[index]!;
      const argument = boundArguments[index]!;
      const parameterType = declaration.parameterTypes?.[index] ?? null;

      this.assertParameterType(
        declaration,
        parameter,
        parameterType,
        argument,
        callExpression,
      );

      localEnvironment.define(parameter.lexeme, copyRuntimeValue(argument));
      parameterTypes.set(parameter.lexeme, parameterType);
    }

    this.currentEnvironment = localEnvironment;
    this.currentFunction = declaration;
    this.currentParameterTypes = parameterTypes;
    this.currentSelf = receiver;
    this.defaultEvaluationContext = null;
    this.functionDepth++;

    try {
      const result = this.evaluateExpressionBlock(declaration.expressions);
      this.assertReturnType(declaration, result);
      return result;
    } catch (error) {
      if (error instanceof ReturnSignal) {
        this.assertReturnType(declaration, error.value);
        return error.value;
      }

      if (error instanceof RangeError) {
        throw this.maximumDepthError(displayName, callExpression);
      }

      throw error;
    } finally {
      this.functionDepth--;
      this.currentEnvironment = previousEnvironment;
      this.currentFunction = previousFunction;
      this.currentParameterTypes = previousParameterTypes;
      this.currentSelf = previousSelf;
      this.defaultEvaluationContext = previousDefaultContext;
    }
  }

  private maximumDepthError(
    displayName: string,
    callExpression: FunctionCall,
  ): Error {
    return new Error(
      "Maximum function call depth exceeded while calling " +
        `'${displayName}'. at ${callExpression.calleeToken.line}:` +
        `${callExpression.calleeToken.column}`,
    );
  }
}
