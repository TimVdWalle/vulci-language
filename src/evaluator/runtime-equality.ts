// Phase 15

import { RuntimeValue } from "../runtime-value.js";

export class RuntimeEqualityError extends Error {}

export function runtimeValuesEqual(
  left: RuntimeValue,
  right: RuntimeValue,
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case "Integer":
      return right.type === "Integer" && left.value === right.value;
    case "String":
      return right.type === "String" && left.value === right.value;
    case "Boolean":
      return right.type === "Boolean" && left.value === right.value;
    case "Null":
      return right.type === "Null";
    case "Struct":
      if (right.type !== "Struct") return false;
      if (left.name !== right.name) return false;
      if (left.fields.length !== right.fields.length) return false;

      return left.fields.every((field, index) => {
        const other = right.fields[index];
        return (
          other !== undefined &&
          field.name === other.name &&
          runtimeValuesEqual(field.value, other.value)
        );
      });
    case "Enum":
      return (
        right.type === "Enum" &&
        left.enumName === right.enumName &&
        left.memberName === right.memberName
      );
    case "Tuple":
      if (right.type !== "Tuple") return false;
      if (left.members.length !== right.members.length) return false;

      return left.members.every((member, index) =>
        runtimeValuesEqual(member, right.members[index]!),
      );
    case "AnonymousObject":
    case "NativeFunction":
      throw new RuntimeEqualityError(
        `Equality is not supported for ${left.type.toLowerCase()} values.`,
      );
  }
}
