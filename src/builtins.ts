// Phase 19

import { Expression, FunctionCall } from "./ast.js";
import { isValidEnvironmentName } from "./dotenv.js";
import { Environment } from "./environment.js";
import { ExecutionEnvironment } from "./execution-environment.js";
import { createStringValue } from "./graphemes.js";
import { NULL_VALUE, RuntimeValue, StringValue } from "./runtime-value.js";
import { Token } from "./token.js";

export const ENVIRONMENT_BUILTIN_NAMES = new Set(["env", "reloadEnv"]);

export function registerBuiltins(
  environment: Environment,
  executionEnvironment = new ExecutionEnvironment({}),
): void {
  environment.define("print", {
    type: "NativeFunction",

    parameters: [
      {
        name: "value",
        required: true,
      },
    ],

    call(arguments_: RuntimeValue[]): RuntimeValue {
      const output = arguments_.map((value) => formatValue(value));

      console.log(...output);

      return NULL_VALUE;
    },
  });

  environment.define("env", {
    type: "NativeFunction",
    codedArgumentCount: true,
    parameters: [
      { name: "name", required: true },
      { name: "fallback", required: false, omittable: true },
    ],

    call(arguments_: RuntimeValue[], expression: FunctionCall): RuntimeValue {
      const name = requireStringArgument(arguments_[0]!, "name", expression);
      const fallback =
        arguments_[1] === undefined
          ? undefined
          : requireStringArgument(arguments_[1], "fallback", expression);

      if (!isValidEnvironmentName(name.value)) {
        throw new Error(
          `E_ENV_NAME: Environment variable name must match ` +
            `'[A-Za-z_][A-Za-z0-9_]*'. at ` +
            environmentArgumentLocation(expression, "name"),
        );
      }

      const value = executionEnvironment.get(name.value);

      if (value !== undefined) return createStringValue(value);
      return fallback ?? NULL_VALUE;
    },
  });

  environment.define("reloadEnv", {
    type: "NativeFunction",
    codedArgumentCount: true,
    parameters: [],

    call(): RuntimeValue {
      executionEnvironment.reload();
      return NULL_VALUE;
    },
  });
}

function requireStringArgument(
  value: RuntimeValue,
  parameterName: string,
  expression: FunctionCall,
): StringValue {
  if (value.type === "String") return value;

  throw new Error(
    `E_ARG_TYPE: Function 'env' parameter '${parameterName}' expects str, ` +
      `but received ${runtimeTypeName(value)}. at ` +
      environmentArgumentLocation(expression, parameterName),
  );
}

function environmentArgumentLocation(
  expression: FunctionCall,
  parameterName: string,
): string {
  if (parameterName === "fallback") {
    const fallbackName = expression.argumentNames.find(
      (name): name is Token => name?.lexeme === "fallback",
    )!;
    return `${fallbackName.line}:${fallbackName.column}`;
  }

  const nameArgument = expression.argumentNames.find(
    (name): name is Token => name?.lexeme === "name",
  );

  if (nameArgument !== undefined) {
    return `${nameArgument.line}:${nameArgument.column}`;
  }

  return expressionLocation(expression.arguments[0]!, expression.calleeToken);
}

function expressionLocation(
  expression: Expression,
  fallback: FunctionCall["calleeToken"],
): string {
  if ("token" in expression) {
    return `${expression.token.line}:${expression.token.column}`;
  }

  if ("calleeToken" in expression) {
    return `${expression.calleeToken.line}:${expression.calleeToken.column}`;
  }

  if ("operator" in expression) {
    return `${expression.operator.line}:${expression.operator.column}`;
  }

  return `${fallback.line}:${fallback.column}`;
}

function runtimeTypeName(value: RuntimeValue): string {
  if (value.type === "Struct") return value.name;
  if (value.type === "Enum") return value.enumName;
  return value.type.toLowerCase();
}

function formatValue(value: RuntimeValue, quoteStrings = false): string {
  switch (value.type) {
    case "Integer":
      return value.value.toString();

    case "String":
      return quoteStrings
        ? `"${escapeEmbeddedString(value.value)}"`
        : value.value;

    case "Boolean":
      return value.value ? "true" : "false";

    case "Null":
      return "null";

    case "Tuple":
      return `(${value.members.map((item) => formatValue(item, quoteStrings)).join(", ")})`;

    case "List":
      return `list[${value.items.map((item) => formatValue(item, true)).join(", ")}]`;

    case "Set":
      return `set[${value.items.map((item) => formatValue(item, true)).join(", ")}]`;

    case "Map":
      return `map[${value.entries
        .map(
          (entry) =>
            `${formatValue(entry.key, true)}: ${formatValue(entry.value, true)}`,
        )
        .join(", ")}]`;

    case "AnonymousObject":
      return `object(${value.fields
        .map(
          (field) => `${field.name}: ${formatValue(field.value, quoteStrings)}`,
        )
        .join(", ")})`;

    case "Struct":
      return `${value.name}(${value.fields
        .map(
          (field) => `${field.name}: ${formatValue(field.value, quoteStrings)}`,
        )
        .join(", ")})`;

    case "Enum":
      return `${value.enumName}.${value.memberName}`;

    case "NativeFunction":
      return "";
  }
}

function escapeEmbeddedString(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t")
    .replaceAll("\r", "\\r");
}
