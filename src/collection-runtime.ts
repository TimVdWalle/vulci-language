// Phase 16

import {
  ListValue,
  MapValue,
  RuntimeValue,
  SetValue,
} from "./runtime-value.js";

export type CollectionValue = ListValue | SetValue | MapValue;

export function isCollectionValue(
  value: RuntimeValue,
): value is CollectionValue {
  return value.type === "List" || value.type === "Set" || value.type === "Map";
}

export function isEligibleMapKey(value: RuntimeValue): boolean {
  return (
    value.type === "String" ||
    value.type === "Integer" ||
    value.type === "Boolean" ||
    value.type === "Enum"
  );
}
