// Phase 16

import { Environment } from "./environment.js";
import { NULL_VALUE, RuntimeValue } from "./runtime-value.js";

export function registerBuiltins(environment: Environment): void {
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
