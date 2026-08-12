// Phase 15

import { readFileSync } from "node:fs";
import path from "node:path";
import { ImportStatement, Program } from "./ast.js";
import { Environment } from "./environment.js";
import { ExpressionEvaluator } from "./evaluator/expression-evaluator.js";
import { collectProgramTypeAnnotations } from "./evaluator/program-type-validation.js";
import { validateStructRecursion } from "./evaluator/struct-validation.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { NULL_VALUE, RuntimeValue } from "./runtime-value.js";

export class Evaluator extends ExpressionEvaluator {
  private static readonly MAX_IMPORT_DEPTH = 64;
  private readonly programs: Program[] = [];

  constructor(environment: Environment) {
    super(environment);
  }

  public evaluate(
    program: Program,
    sourceFilePath?: string,
    importDepth = 0,
  ): RuntimeValue {
    this.registerDeclarations(program);
    this.programs.push(program);

    for (const loadedProgram of this.programs) {
      this.validateProgramBindings(loadedProgram);
    }

    let result: RuntimeValue = NULL_VALUE;
    const resolvedSourcePath =
      sourceFilePath === undefined ? undefined : path.resolve(sourceFilePath);

    for (const statement of program.statements) {
      if (statement.type !== "ImportStatement") break;
      this.evaluateImport(statement, resolvedSourcePath, importDepth);
    }

    for (const annotation of collectProgramTypeAnnotations(program)) {
      this.assertKnownTypeAnnotation(annotation);
    }

    validateStructRecursion(this.structs);

    for (const statement of program.statements) {
      if (statement.type === "ImportStatement") continue;
      result = this.evaluateStatement(statement);
    }

    return result;
  }

  private evaluateImport(
    statement: ImportStatement,
    importingSourcePath: string | undefined,
    importDepth: number,
  ): void {
    if (importingSourcePath === undefined) {
      throw new Error(
        `Cannot resolve import '${statement.path}' without an importing ` +
          `source file. at ${statement.keyword.line}:` +
          `${statement.keyword.column}`,
      );
    }

    const nextDepth = importDepth + 1;

    if (nextDepth > Evaluator.MAX_IMPORT_DEPTH) {
      throw new Error(
        `Maximum import depth of ${Evaluator.MAX_IMPORT_DEPTH} exceeded ` +
          `while importing '${statement.path}'. at ` +
          `${statement.keyword.line}:${statement.keyword.column}`,
      );
    }

    const importedPath = path.resolve(
      path.dirname(importingSourcePath),
      statement.path,
    );

    let source: string;

    try {
      source = readFileSync(importedPath, "utf8");
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : "";

      throw new Error(
        `Unable to import '${statement.path}'.${detail} at ` +
          `${statement.keyword.line}:${statement.keyword.column}`,
      );
    }

    const tokens = new Lexer(source).lex();
    const importedProgram = new Parser(tokens, {
      structNames: this.structs.keys(),
      enumNames: this.enums.keys(),
    }).parse();

    this.evaluate(importedProgram, importedPath, nextDepth);
  }
}
