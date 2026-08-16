// Phase 17

import { IndexExpression, MemberCall } from "../ast.js";
import { CollectionLiteral, MapLiteral } from "../collection-ast.js";
import { isEligibleMapKey } from "../collection-runtime.js";
import { createStringValue, graphemesOf } from "../graphemes.js";
import {
  FALSE_VALUE,
  ListValue,
  MapEntryValue,
  MapValue,
  RuntimeValue,
  SetValue,
  TRUE_VALUE,
} from "../runtime-value.js";
import { copyRuntimeValue } from "./value-copy.js";
import { runtimeValuesEqual } from "./runtime-equality.js";
import { EachEvaluator } from "./each-evaluator.js";

export abstract class CollectionEvaluator extends EachEvaluator {
  protected evaluateCollectionLiteral(
    expression: CollectionLiteral,
  ): ListValue | SetValue | MapValue {
    if (expression.type === "MapLiteral") {
      return this.evaluateMapLiteral(expression);
    }

    if (expression.type === "ListLiteral") {
      return {
        type: "List",
        items: expression.items.map((item) =>
          copyRuntimeValue(this.evaluateExpression(item)),
        ),
      };
    }

    const items: RuntimeValue[] = [];

    for (const itemExpression of expression.items) {
      const item = this.evaluateExpression(itemExpression);
      if (items.some((existing) => runtimeValuesEqual(existing, item))) {
        continue;
      }
      items.push(copyRuntimeValue(item));
    }

    return { type: "Set", items };
  }

  protected evaluateIndexExpression(expression: IndexExpression): RuntimeValue {
    const target = this.evaluateExpression(expression.target);
    const index = this.evaluateExpression(expression.index);
    const location = `${expression.bracket.line}:${expression.bracket.column}`;

    if (target.type === "Map") {
      this.assertEligibleMapKey(index, location);
      const entry = target.entries.find((candidate) =>
        runtimeValuesEqual(candidate.key, index),
      );

      if (entry === undefined) {
        throw new Error(`Map key was not found. at ${location}`);
      }

      return copyRuntimeValue(entry.value);
    }

    if (
      target.type !== "Tuple" &&
      target.type !== "List" &&
      target.type !== "String"
    ) {
      throw new Error(
        `IDX_TARGET: Value does not support indexing. at ${location}`,
      );
    }

    if (index.type !== "Integer") {
      throw new Error(`IDX_TYPE: Index must be an integer. at ${location}`);
    }

    const values =
      target.type === "Tuple"
        ? target.members
        : target.type === "List"
          ? target.items
          : graphemesOf(target);

    if (index.value < 0 || index.value >= values.length) {
      throw new Error(
        `IDX_RANGE: Index ${index.value} is outside the valid range. at ${location}`,
      );
    }

    const value = values[index.value]!;
    return typeof value === "string"
      ? createStringValue(value)
      : target.type === "Tuple"
        ? value
        : copyRuntimeValue(value);
  }

  protected evaluateCollectionMemberCall(
    expression: MemberCall,
    receiver: ListValue | SetValue | MapValue,
  ): RuntimeValue {
    switch (expression.member.lexeme) {
      case "contains":
        return this.evaluateContains(expression, receiver);
      case "add":
        return this.evaluateAdd(expression, receiver);
      case "remove":
        if (receiver.type !== "Map") {
          return this.evaluateRemove(expression, receiver);
        }
        break;
    }

    throw new Error(
      `E_MEM_UNKNOWN: Type '${receiver.type.toLowerCase()}' has no member ` +
        `'${expression.member.lexeme}'. at ${expression.member.line}:` +
        `${expression.member.column}`,
    );
  }

  private evaluateMapLiteral(expression: MapLiteral): MapValue {
    const entries: MapEntryValue[] = [];

    for (const entryExpression of expression.entries) {
      const key = this.evaluateExpression(entryExpression.key);
      const location = `${entryExpression.colon.line}:${entryExpression.colon.column}`;
      this.assertEligibleMapKey(key, location);

      if (entries.some((entry) => runtimeValuesEqual(entry.key, key))) {
        throw new Error(`Duplicate map key. at ${location}`);
      }

      const value = this.evaluateExpression(entryExpression.value);
      entries.push({
        key: copyRuntimeValue(key),
        value: copyRuntimeValue(value),
      });
    }

    return { type: "Map", entries };
  }

  private evaluateContains(
    expression: MemberCall,
    receiver: ListValue | SetValue | MapValue,
  ): RuntimeValue {
    const [value] = this.evaluateMemberArguments(expression, ["value"]);

    if (receiver.type === "Map") {
      this.assertEligibleMapKey(
        value!,
        `${expression.member.line}:${expression.member.column}`,
      );
      return receiver.entries.some((entry) =>
        runtimeValuesEqual(entry.key, value!),
      )
        ? TRUE_VALUE
        : FALSE_VALUE;
    }

    return receiver.items.some((item) => runtimeValuesEqual(item, value!))
      ? TRUE_VALUE
      : FALSE_VALUE;
  }

  private evaluateAdd(
    expression: MemberCall,
    receiver: ListValue | SetValue | MapValue,
  ): ListValue | SetValue | MapValue {
    if (receiver.type === "Map") {
      const [key, value] = this.evaluateMemberArguments(expression, [
        "key",
        "value",
      ]);
      const location = `${expression.member.line}:${expression.member.column}`;
      this.assertEligibleMapKey(key!, location);

      if (
        receiver.entries.some((entry) => runtimeValuesEqual(entry.key, key!))
      ) {
        throw new Error(`Duplicate map key. at ${location}`);
      }

      return {
        type: "Map",
        entries: [
          ...this.copyMapEntries(receiver.entries),
          { key: copyRuntimeValue(key!), value: copyRuntimeValue(value!) },
        ],
      };
    }

    const [value] = this.evaluateMemberArguments(expression, ["value"]);
    const items = receiver.items.map(copyRuntimeValue);

    if (
      receiver.type === "List" ||
      !items.some((item) => runtimeValuesEqual(item, value!))
    ) {
      items.push(copyRuntimeValue(value!));
    }

    return { type: receiver.type, items };
  }

  private evaluateRemove(
    expression: MemberCall,
    receiver: ListValue | SetValue,
  ): ListValue | SetValue {
    const [value] = this.evaluateMemberArguments(expression, ["value"]);
    const index = receiver.items.findIndex((item) =>
      runtimeValuesEqual(item, value!),
    );
    const items = receiver.items
      .filter((_, itemIndex) => itemIndex !== index)
      .map(copyRuntimeValue);
    return { type: receiver.type, items };
  }

  private evaluateMemberArguments(
    expression: MemberCall,
    parameterNames: string[],
  ): RuntimeValue[] {
    const values = expression.arguments.map((argument) =>
      this.evaluateExpression(argument),
    );

    if (values.length !== parameterNames.length) {
      throw new Error(
        `E_ARG_COUNT: Member '${expression.member.lexeme}' expects ` +
          `${parameterNames.length} argument${parameterNames.length === 1 ? "" : "s"}, ` +
          `but received ${values.length}. at ${expression.member.line}:` +
          `${expression.member.column}`,
      );
    }

    const bound: Array<RuntimeValue | undefined> = parameterNames.map(
      () => undefined,
    );
    let positionalIndex = 0;

    for (let index = 0; index < values.length; index++) {
      const argumentName = expression.argumentNames[index];
      const parameterIndex =
        argumentName === null || argumentName === undefined
          ? positionalIndex++
          : parameterNames.indexOf(argumentName.lexeme);

      if (parameterIndex < 0) {
        throw new Error(
          `Member '${expression.member.lexeme}' has no parameter named ` +
            `'${argumentName!.lexeme}'. at ${argumentName!.line}:` +
            `${argumentName!.column}`,
        );
      }

      if (bound[parameterIndex] !== undefined) {
        throw new Error(
          `Argument '${parameterNames[parameterIndex]}' is supplied more than ` +
            `once to member '${expression.member.lexeme}'. at ` +
            `${expression.member.line}:${expression.member.column}`,
        );
      }

      bound[parameterIndex] = values[index];
    }

    return bound.map((value) => value!);
  }

  private copyMapEntries(entries: MapEntryValue[]): MapEntryValue[] {
    return entries.map((entry) => ({
      key: copyRuntimeValue(entry.key),
      value: copyRuntimeValue(entry.value),
    }));
  }

  private assertEligibleMapKey(value: RuntimeValue, location: string): void {
    if (isEligibleMapKey(value)) return;
    throw new Error(
      "Map keys must be str, int, bool, or enum values. " + `at ${location}`,
    );
  }
}
