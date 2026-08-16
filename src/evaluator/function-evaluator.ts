// Phase 17

import {
  EnumDeclaration,
  FunctionCall,
  FunctionDeclaration,
  MemberCall,
  Program,
  StructDeclaration,
} from "../ast.js";
import { RuntimeValue } from "../runtime-value.js";
import { isCollectionValue } from "../collection-runtime.js";
import { BUILT_IN_TYPE_NAMES } from "../type-names.js";
import { CallExecutor } from "./call-executor.js";
import { findEnumBindingConflict } from "./enum-validation.js";
import { findStructBindingConflict } from "./struct-validation.js";

export abstract class FunctionEvaluator extends CallExecutor {
  protected registerDeclarations(program: Program): void {
    const structDeclarations = program.statements.flatMap((statement) =>
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "StructDeclaration"
        ? [statement.expression]
        : [],
    );
    const functionDeclarations = program.statements.flatMap((statement) =>
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "FunctionDeclaration"
        ? [statement.expression]
        : [],
    );
    const enumDeclarations = program.statements.flatMap((statement) =>
      statement.type === "ExpressionStatement" &&
      statement.expression.type === "EnumDeclaration"
        ? [statement.expression]
        : [],
    );

    this.registerStructs(structDeclarations);
    this.registerFunctions(functionDeclarations);
    this.registerEnums(enumDeclarations);
    this.validateStructBindings(program, structDeclarations);
    this.validateEnumBindings(program, enumDeclarations);
  }

  protected validateProgramBindings(program: Program): void {
    this.validateStructBindings(program, []);
    this.validateEnumBindings(program, []);
  }

  protected evaluateFunctionCall(expression: FunctionCall): RuntimeValue {
    if (this.enums.has(expression.callee)) {
      throw new Error(
        `Enum '${expression.callee}' is not callable. at ` +
          `${expression.calleeToken.line}:${expression.calleeToken.column}`,
      );
    }

    if (this.structs.has(expression.callee)) {
      const positionalArgument = expression.argumentNames.findIndex(
        (argumentName) => argumentName === null,
      );

      if (positionalArgument !== -1) {
        throw new Error(
          `Struct construction requires named fields. at ` +
            `${expression.calleeToken.line}:` +
            `${expression.calleeToken.column}`,
        );
      }

      return this.evaluateStructConstruction({
        type: "StructConstruction",
        constructor: expression.calleeToken,
        fields: expression.arguments.map((value, index) => ({
          name: expression.argumentNames[index]!,
          value,
        })),
      });
    }

    const eachValue = this.eachBindingValue(expression.callee);

    if (eachValue !== undefined) {
      if (eachValue.type === "NativeFunction") {
        return this.callNativeFunction(eachValue, expression);
      }

      throw new Error(
        `Cannot call '${expression.callee}': value is not a function. at ` +
          `${expression.calleeToken.line}:` +
          `${expression.calleeToken.column}`,
      );
    }

    const localValue = this.findValue(
      this.currentEnvironment,
      expression.callee,
    );

    if (
      localValue !== undefined &&
      this.currentEnvironment !== this.environment
    ) {
      if (localValue.type !== "NativeFunction") {
        throw new Error(
          `Cannot call '${expression.callee}': value is not a function. at ` +
            `${expression.calleeToken.line}:` +
            `${expression.calleeToken.column}`,
        );
      }

      return this.callNativeFunction(localValue, expression);
    }

    const globalValue = this.findValue(this.environment, expression.callee);

    if (globalValue !== undefined) {
      if (globalValue.type === "NativeFunction") {
        return this.callNativeFunction(globalValue, expression);
      }

      if (this.defaultEvaluationContext === null) {
        throw new Error(
          `Cannot call '${expression.callee}': value is not a function. at ` +
            `${expression.calleeToken.line}:` +
            `${expression.calleeToken.column}`,
        );
      }
    }

    const declaration = this.functions.get(expression.callee);

    if (declaration === undefined) {
      throw new Error(
        `Undefined function '${expression.callee}'. at ` +
          `${expression.calleeToken.line}:${expression.calleeToken.column}`,
      );
    }

    return this.callFunction(declaration, expression);
  }

  protected evaluateMemberCall(expression: MemberCall): RuntimeValue {
    this.rejectEnumMemberCall(expression);

    const receiver = this.evaluateExpression(expression.receiver);

    if (receiver.type === "String") {
      return this.evaluateStringMemberCall(expression, receiver);
    }

    if (isCollectionValue(receiver)) {
      return this.evaluateCollectionMemberCall(expression, receiver);
    }

    if (receiver.type === "Struct") {
      const method = this.findStructMethod(
        receiver.name,
        expression.member.lexeme,
      );

      if (method === undefined) {
        throw new Error(
          `E_MEM_UNKNOWN: Struct '${receiver.name}' has no method ` +
            `'${expression.member.lexeme}'. at ${expression.member.line}:` +
            `${expression.member.column}`,
        );
      }

      const callExpression: FunctionCall = {
        type: "FunctionCall",
        callee: expression.member.lexeme,
        calleeToken: expression.member,
        arguments: expression.arguments,
        argumentNames: expression.argumentNames,
      };

      return this.callFunction(
        method,
        callExpression,
        receiver,
        `${receiver.name}.${method.name.lexeme}`,
      );
    }

    throw new Error(
      `E_MEM_TYPE: Type '${this.runtimeTypeName(receiver)}' does not support ` +
        `member '${expression.member.lexeme}'. at ` +
        `${expression.member.line}:${expression.member.column}`,
    );
  }

  private registerStructs(declarations: StructDeclaration[]): void {
    for (const declaration of declarations) {
      const name = declaration.name.lexeme;

      if (
        BUILT_IN_TYPE_NAMES.has(name) ||
        this.structs.has(name) ||
        this.functions.has(name) ||
        this.enums.has(name) ||
        this.findValue(this.environment, name) !== undefined
      ) {
        throw this.structDuplicateError(declaration, name);
      }

      this.validateMemberNames(declaration);
      this.structs.set(name, declaration);
    }
  }

  private registerEnums(declarations: EnumDeclaration[]): void {
    for (const declaration of declarations) {
      const name = declaration.name.lexeme;

      if (
        name === "self" ||
        BUILT_IN_TYPE_NAMES.has(name) ||
        this.enums.has(name) ||
        this.structs.has(name) ||
        this.functions.has(name) ||
        this.findValue(this.environment, name) !== undefined
      ) {
        throw this.enumDuplicateError(declaration, name);
      }

      this.validateEnumMemberNames(declaration);
      this.enums.set(name, declaration);
    }
  }

  private registerFunctions(declarations: FunctionDeclaration[]): void {
    for (const declaration of declarations) {
      const name = declaration.name.lexeme;

      if (this.structs.has(name)) {
        const struct = this.structs.get(name)!;
        throw this.structDuplicateError(struct, name);
      }

      if (this.enums.has(name)) {
        throw new Error(
          `Name '${name}' is already defined as an enum. at ` +
            `${declaration.name.line}:${declaration.name.column}`,
        );
      }

      if (this.functions.has(name)) {
        throw new Error(
          `Function '${name}' is already defined. at ` +
            `${declaration.name.line}:${declaration.name.column}`,
        );
      }

      if (this.findValue(this.environment, name) !== undefined) {
        throw new Error(
          `Name '${name}' is already defined. at ` +
            `${declaration.name.line}:${declaration.name.column}`,
        );
      }

      this.functions.set(name, declaration);
    }
  }

  private validateStructBindings(
    program: Program,
    declarations: StructDeclaration[],
  ): void {
    const structNames = new Set(this.structs.keys());
    const conflict = findStructBindingConflict(program, structNames);

    if (conflict === null) return;

    const location =
      conflict.token ??
      declarations.find(
        (declaration) => declaration.name.lexeme === conflict.name,
      )?.name;

    const locationText =
      location === undefined ? "" : ` at ${location.line}:${location.column}`;

    throw new Error(
      `E_STRUCT_DUP: Struct name '${conflict.name}' cannot be rebound as a ` +
        `variable or parameter.${locationText}`,
    );
  }

  private validateEnumBindings(
    program: Program,
    declarations: EnumDeclaration[],
  ): void {
    const enumNames = new Set(this.enums.keys());
    const conflict = findEnumBindingConflict(program, enumNames);

    if (conflict === null) return;

    const location =
      conflict.token ??
      declarations.find(
        (declaration) => declaration.name.lexeme === conflict.name,
      )?.name;

    const locationText =
      location === undefined ? "" : ` at ${location.line}:${location.column}`;

    throw new Error(
      `E_ENUM_DUP: Enum name '${conflict.name}' cannot be rebound as a ` +
        `variable or parameter.${locationText}`,
    );
  }

  private validateEnumMemberNames(declaration: EnumDeclaration): void {
    const names = new Set<string>();

    for (const member of declaration.members) {
      if (names.has(member.lexeme)) {
        throw new Error(
          `E_ENUM_MEMBER_DUP: Duplicate enum member '${member.lexeme}'. at ` +
            `${member.line}:${member.column}`,
        );
      }

      names.add(member.lexeme);
    }
  }

  private validateMemberNames(declaration: StructDeclaration): void {
    const names = new Set<string>();

    for (const member of [...declaration.fields, ...declaration.methods]) {
      if (names.has(member.name.lexeme)) {
        throw new Error(
          `E_STRUCT_MEMBER_DUP: Duplicate struct member ` +
            `'${member.name.lexeme}'. at ${member.name.line}:` +
            `${member.name.column}`,
        );
      }

      names.add(member.name.lexeme);
    }
  }

  private enumDuplicateError(
    declaration: EnumDeclaration,
    name: string,
  ): Error {
    return new Error(
      `E_ENUM_DUP: Enum name '${name}' conflicts with an existing type or ` +
        `value. at ${declaration.name.line}:${declaration.name.column}`,
    );
  }

  private structDuplicateError(
    declaration: StructDeclaration,
    name: string,
  ): Error {
    return new Error(
      `E_STRUCT_DUP: Struct name '${name}' conflicts with an existing type or ` +
        `value. at ${declaration.name.line}:${declaration.name.column}`,
    );
  }
}
