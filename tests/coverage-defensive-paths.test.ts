// Phase: Phase 15 pre-collections language improvements

import assert from "node:assert/strict";
import test from "node:test";
import { Expression, FunctionCall, StructDeclaration } from "../src/ast.js";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { findEnumBindingConflict } from "../src/evaluator/enum-validation.js";
import { collectProgramTypeAnnotations } from "../src/evaluator/program-type-validation.js";
import {
  findStructBindingConflict,
  validateStructRecursion,
} from "../src/evaluator/struct-validation.js";
import { Lexer } from "../src/lexer.js";
import { LexerState } from "../src/lexer/lexer-state.js";
import { Parser } from "../src/parser.js";
import { ParserOptions } from "../src/parser/parser-context.js";
import { RuntimeValue } from "../src/runtime-value.js";
import { ScannedStringSegment, Token, TokenType } from "../src/token.js";

const token: Token = {
  type: TokenType.Identifier,
  lexeme: "value",
  line: 3,
  column: 5,
};

function parse(source: string, options: ParserOptions = {}) {
  return new Parser(new Lexer(source).lex(), options).parse();
}

class EvaluatorProbe extends Evaluator {
  public useChildEnvironment(): void {
    this.currentEnvironment = new Environment();
  }

  public readIdentifier(name: string): RuntimeValue {
    return this.evaluateBareIdentifier({
      type: "VariableReference",
      name,
      token: { ...token, lexeme: name },
    });
  }

  public evaluateCall(expression: FunctionCall): RuntimeValue {
    return this.evaluateFunctionCall(expression);
  }

  public evaluateUnsupportedLogical(): RuntimeValue {
    return this.evaluateLogicalExpression(
      { ...token, type: TokenType.Plus, lexeme: "+" },
      { type: "BooleanLiteral", value: true },
      { type: "BooleanLiteral", value: false },
    );
  }
}

class AssignmentProbe extends Parser {
  public hasAssignment(expression: Expression): boolean {
    return this.containsAssignment(expression);
  }
}

class ParserStateProbe extends Parser {
  public previousToken(): Token {
    return this.previous();
  }
}

class LexerStateProbe extends LexerState {
  public nextCharacter(): string {
    return this.peekNext();
  }
}

class MissingTargetMap extends Map<string, StructDeclaration> {
  public override has(name: string): boolean {
    return name === "Missing" || super.has(name);
  }
}

test("covers defensive evaluator branches", () => {
  const environment = new Environment();
  environment.define("ordinary", { type: "Integer", value: 42 });
  const identifierProbe = new EvaluatorProbe(environment);
  identifierProbe.useChildEnvironment();
  assert.deepEqual(identifierProbe.readIdentifier("ordinary"), {
    type: "Integer",
    value: 42,
  });

  const operatorProbe = new EvaluatorProbe(new Environment());
  assert.throws(
    () => operatorProbe.evaluateUnsupportedLogical(),
    /Unsupported logical operator '\+'/,
  );

  const structProbe = new EvaluatorProbe(new Environment());
  structProbe.evaluate(parse("struct Value { int number }"));
  assert.throws(
    () =>
      structProbe.evaluateCall({
        type: "FunctionCall",
        callee: "Value",
        calleeToken: { ...token, lexeme: "Value" },
        arguments: [{ type: "IntegerLiteral", value: 1 }],
        argumentNames: [null],
      }),
    /Struct construction requires named fields/,
  );

  const enumEvaluator = new Evaluator(new Environment());
  enumEvaluator.evaluate(parse("enum Status { Pending }"));
  assert.throws(
    () => enumEvaluator.evaluate(parse("Status = 1")),
    /variable or parameter\.$/,
  );
});

test("finds binding conflicts inside defensive struct defaults", () => {
  const program = parse("struct Box { int value = 1 }");
  const statement = program.statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "StructDeclaration");
  if (statement.expression.type !== "StructDeclaration") assert.fail();

  statement.expression.fields[0]!.defaultValue = {
    type: "AssignmentExpression",
    name: "Reserved",
    value: { type: "IntegerLiteral", value: 1 },
  };

  assert.equal(
    findEnumBindingConflict(program, new Set(["Reserved"]))?.name,
    "Reserved",
  );
  assert.equal(
    findStructBindingConflict(program, new Set(["Reserved"]))?.name,
    "Reserved",
  );
});

test("covers defensive type-annotation paths", () => {
  const collectionProgram = parse(
    "fn identity(any value) returns any { value }",
  );
  const collectionStatement = collectionProgram.statements[0];
  assert.equal(collectionStatement?.type, "ExpressionStatement");
  assert.equal(collectionStatement.expression.type, "FunctionDeclaration");
  if (collectionStatement.expression.type !== "FunctionDeclaration") {
    assert.fail();
  }
  collectionStatement.expression.parameterTypes = [null];
  assert.equal(collectProgramTypeAnnotations(collectionProgram).length, 1);

  const returnProgram = parse("fn invalid() returns int { 1 }\ninvalid()");
  const returnStatement = returnProgram.statements[0];
  assert.equal(returnStatement?.type, "ExpressionStatement");
  assert.equal(returnStatement.expression.type, "FunctionDeclaration");
  if (returnStatement.expression.type !== "FunctionDeclaration") {
    assert.fail();
  }
  returnStatement.expression.returnType = { members: [] };
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(returnProgram),
    /at 1:4/,
  );
});

test("covers a defensive missing struct-recursion target", () => {
  const program = parse("struct Node { Missing next }", {
    allowUnknownTypeNames: true,
  });
  const statement = program.statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  assert.equal(statement.expression.type, "StructDeclaration");
  if (statement.expression.type !== "StructDeclaration") assert.fail();

  assert.doesNotThrow(() =>
    validateStructRecursion(
      new MissingTargetMap([["Node", statement.expression]]),
    ),
  );
});

test("covers defensive parser branches", () => {
  const importTokens = new Lexer("import 'helpers.vci'").lex();
  const pathToken = importTokens[1]!;
  const segments: ScannedStringSegment[] = [
    { type: "Interpolation", source: "ignored", line: 1, column: 8 },
    { type: "Text", value: "helpers.vci" },
  ];
  Object.defineProperty(segments, "some", { value: () => false });
  pathToken.stringSegments = segments;
  assert.equal(
    new Parser(importTokens).parse().statements[0]?.path,
    "helpers.vci",
  );

  assert.throws(() => parse("1 is |int"), /cannot start with '\|'/);
  assert.throws(
    () => new ParserStateProbe(new Lexer("").lex()).previousToken(),
    /Parser has no previous token/,
  );

  const declarationProgram = parse(
    "fn update(any value) returns int { return value = 1 }",
  );
  const declarationStatement = declarationProgram.statements[0];
  assert.equal(declarationStatement?.type, "ExpressionStatement");
  assert.equal(declarationStatement.expression.type, "FunctionDeclaration");
  if (declarationStatement.expression.type !== "FunctionDeclaration") {
    assert.fail();
  }
  const assignmentProbe = new AssignmentProbe(new Lexer("").lex());
  assert.equal(
    assignmentProbe.hasAssignment(
      declarationStatement.expression.expressions[0]!,
    ),
    true,
  );
});

test("covers the lexer lookahead boundary", () => {
  assert.equal(new LexerStateProbe("").nextCharacter(), "\0");
});
