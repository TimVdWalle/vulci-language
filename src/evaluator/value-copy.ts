// Phase 16

import { RuntimeValue } from "../runtime-value.js";

export function copyRuntimeValue(value: RuntimeValue): RuntimeValue {
  if (value.type === "List" || value.type === "Set" || value.type === "Map") {
    return value;
  }

  if (value.type === "Tuple") {
    return {
      type: "Tuple",
      members: value.members.map(copyRuntimeValue),
    };
  }

  if (value.type === "AnonymousObject") {
    return {
      type: "AnonymousObject",
      fields: value.fields.map((field) => ({
        name: field.name,
        value: copyRuntimeValue(field.value),
      })),
    };
  }

  if (value.type === "Struct") {
    return {
      type: "Struct",
      name: value.name,
      fields: value.fields.map((field) => ({
        name: field.name,
        value: copyRuntimeValue(field.value),
      })),
    };
  }

  if (value.type === "Enum") {
    return {
      type: "Enum",
      enumName: value.enumName,
      memberName: value.memberName,
    };
  }

  return value;
}
