// Phase 15B

import assert from "node:assert/strict";
import test from "node:test";
import { Expression, FunctionDeclaration, TypeAnnotation } from "../src/ast.js";
import { locatedError, sourceError } from "../src/diagnostics/source-error.js";
import { Environment } from "../src/environment.js";
import { ScopeResolver } from "../src/evaluator/scope-resolver.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { ParserOptions } from "../src/parser/parser-context.js";
import { NULL_VALUE, RuntimeValue, StructValue } from "../src/runtime-value.js";
import { scanStringLiteral } from "../src/string-lexer.js";
import { Token, TokenType } from "../src/token.js";

const token: Token = {
  type: TokenType.Identifier,
  lexeme: "value",
  line: 3,
  column: 5,
};
const integer: RuntimeValue = { type: "Integer", value: 1 };
const intType: TypeAnnotation = {
  members: [{ type: "NamedType", lexeme: "int", token }],
};

function parse(source: string, options: ParserOptions = {}) {
  return new Parser(new Lexer(source).lex(), options).parse();
}

function parseExpression(
  source: string,
  options: ParserOptions = {},
): Expression {
  const statement = parse(source, options).statements[0];

  assert.equal(statement?.type, "ExpressionStatement");
  return statement.expression;
}

class AssignmentProbe extends Parser {
  public hasAssignment(expression: Expression): boolean {
    return this.containsAssignment(expression);
  }
}

class BlockProbe extends Parser {
  public parseReturnBlock(): Expression[] {
    return this.expressionBlock();
  }

  protected override expression(): Expression {
    const keyword = this.advance();

    return { type: "ReturnExpression", keyword, value: null };
  }
}

class ScopeProbe extends ScopeResolver {
  public assign(name: string, value: RuntimeValue = integer): void {
    this.assignVariable(name, value);
  }

  public find(environment: Environment, name: string) {
    return this.findValue(environment, name);
  }

  public useChildEnvironment(): void {
    this.currentEnvironment = new Environment();
  }

  public setSelf(value: StructValue | null): void {
    this.currentSelf = value;
  }

  public setDefaultContext(value: "function" | "struct" | null): void {
    this.defaultEvaluationContext = value;
  }

  public addEnum(name: string): void {
    this.enums.set(name, {} as never);
  }

  public addStruct(name: string): void {
    this.structs.set(name, {} as never);
  }

  public addFunction(name: string): void {
    this.functions.set(name, {} as never);
  }

  public setParameter(
    name: string,
    type: TypeAnnotation | null,
    declaration: FunctionDeclaration | null,
  ): void {
    this.currentParameterTypes.set(name, type);
    this.currentFunction = declaration;
  }

  protected evaluateExpression(): RuntimeValue {
    return NULL_VALUE;
  }

  protected evaluateDefaultExpression(): RuntimeValue {
    return NULL_VALUE;
  }

  protected evaluateExpressionBlock(): RuntimeValue {
    return NULL_VALUE;
  }
}

test("formats source errors with and without diagnostic codes", () => {
  assert.equal(sourceError(token, "Problem").message, "Problem at 3:5");
  assert.equal(
    sourceError(token, "Problem", "E_TEST").message,
    "E_TEST: Problem at 3:5",
  );
  assert.equal(
    locatedError(4, 6, "Located problem", "E_TEST").message,
    "E_TEST: Located problem at 4:6",
  );
});

test("covers every scope-assignment decision", () => {
  const environment = new Environment();
  const probe = new ScopeProbe(environment);
  const self: StructValue = { type: "Struct", name: "Value", fields: [] };

  assert.throws(() => probe.assign("self"), /E_SELF_CONTEXT/);
  probe.setSelf(self);
  assert.throws(() => probe.assign("self"), /E_SELF_ASSIGN/);
  probe.setSelf(null);

  probe.setDefaultContext("function");
  assert.throws(() => probe.assign("local"), /default expressions/);
  probe.setDefaultContext(null);

  probe.addEnum("Status");
  assert.throws(() => probe.assign("Status"), /E_ENUM_DUP/);
  probe.addStruct("Value");
  assert.throws(() => probe.assign("Value"), /E_STRUCT_DUP/);
  probe.addFunction("calculate");
  assert.throws(
    () => probe.assign("calculate"),
    /already defined as a function/,
  );
  assert.throws(() => probe.assign("ordinary"), /must use the.*prefix/);

  probe.assign("$global");
  probe.useChildEnvironment();
  assert.throws(
    () => probe.assign("$missing"),
    /must be declared at the top level/,
  );
  probe.assign("$global", { type: "Integer", value: 2 });

  probe.assign("untyped");
  probe.setParameter("dynamic", null, null);
  probe.assign("dynamic", { type: "Boolean", value: true });

  const declaration = parseExpression(`fn change(int value) returns int {
  value
}`);
  assert.equal(declaration.type, "FunctionDeclaration");
  probe.setParameter("value", intType, declaration);
  probe.assign("value", { type: "Integer", value: 2 });
  assert.throws(
    () => probe.assign("value", { type: "Boolean", value: true }),
    /Cannot assign boolean to parameter 'value'/,
  );

  probe.setParameter("orphan", intType, null);
  assert.throws(
    () => probe.assign("orphan", { type: "Boolean", value: false }),
    /function '<unknown>'.*at 0:0/,
  );
});

test("covers successful, missing, and unexpected scope lookups", () => {
  const probe = new ScopeProbe(new Environment());
  const environment = new Environment();
  environment.define("value", integer);

  assert.deepEqual(probe.find(environment, "value"), integer);
  assert.equal(probe.find(environment, "missing"), undefined);

  class ThrowingEnvironment extends Environment {
    public override get(): RuntimeValue {
      throw new Error("Different failure.");
    }
  }

  class NonErrorEnvironment extends Environment {
    public override get(): RuntimeValue {
      throw "Different failure.";
    }
  }

  assert.throws(
    () => probe.find(new ThrowingEnvironment(), "value"),
    /Different/,
  );
  assert.throws(() => probe.find(new NonErrorEnvironment(), "value"));
});

test("detects assignments through every compound expression shape", () => {
  const probe = new AssignmentProbe(new Lexer("null").lex());
  const noAssignmentSources = [
    "not false",
    "1 + 2",
    "1 is int",
    "1 < 2 < 3",
    "if (true) { 1 } else { 2 }",
    "if (true) { 1 }",
    "calculate(1)",
    "object(value: 1).calculate(2)",
    "object(value: 1).value",
    "(1, 2)[0]",
    "object(value: 1)",
    "Value(value: 1)",
    "(1, 2)",
    '"value {{1}}"',
    "enum Status { Pending }",
    "1",
    "true",
    "null",
    "value",
  ];

  for (const source of noAssignmentSources) {
    const options = source.startsWith("Value")
      ? { structNames: ["Value"] }
      : {};
    assert.equal(probe.hasAssignment(parseExpression(source, options)), false);
  }

  const functionDeclaration = parseExpression(`fn calculate() returns int {
  1
}`);
  const structDeclaration = parseExpression(`struct Value {
  int field = 1
  fn calculate() returns int {
    1
  }
}`);
  const returnExpressions = parseExpression(`fn calculate() returns null {
  return
}`);

  assert.equal(probe.hasAssignment(functionDeclaration), false);
  assert.equal(probe.hasAssignment(structDeclaration), false);
  assert.equal(returnExpressions.type, "FunctionDeclaration");
  assert.equal(probe.hasAssignment(returnExpressions.expressions[0]!), false);
  assert.equal(probe.hasAssignment(parseExpression("value = 1")), true);
  assert.equal(probe.hasAssignment(parseExpression("1 + (value = 2)")), true);
});

test("reports unreachable expressions after returns in every block kind", () => {
  assert.throws(
    () =>
      parse(`if (true) {
  return 1
  2
}`),
    /Unreachable expression after unconditional return/,
  );
  assert.throws(
    () =>
      parse(`fn calculate() returns int {
  return 1
  2
}`),
    /Unreachable expression after unconditional return/,
  );
  assert.doesNotThrow(() => parse("fn calculate() returns int { 1 }"));
  assert.throws(
    () => parse("fn calculate() returns int { 1"),
    /Expected '}' after function body/,
  );

  assert.doesNotThrow(() =>
    parse(`if (true) {
  return 1
}`),
  );

  assert.equal(
    new BlockProbe(new Lexer("{ marker\n}").lex()).parseReturnBlock().length,
    1,
  );
  assert.throws(
    () =>
      new BlockProbe(new Lexer("{ marker\nnext\n}").lex()).parseReturnBlock(),
    /Unreachable expression after unconditional return/,
  );
});

test("scans empty, multiline, quoted, escaped, and nested interpolation paths", () => {
  assert.deepEqual(scanStringLiteral('""', 0, 1, 1).segments, []);
  assert.deepEqual(scanStringLiteral("''", 0, 1, 1).segments, []);

  const nested = scanStringLiteral(
    '"""\n  before {{ call(\'a\\\'b\', {value}) }} after\n"""',
    0,
    1,
    1,
  );

  assert.deepEqual(nested.segments, [
    { type: "Text", value: "before " },
    {
      type: "Interpolation",
      source: " call('a\\'b', {value}) ",
      line: 2,
      column: 12,
    },
    { type: "Text", value: " after" },
  ]);

  const tripleQuoted = scanStringLiteral("\"{{ '''quoted''' }}\"", 0, 1, 1);
  assert.equal(tripleQuoted.segments[0]?.type, "Interpolation");

  const multilineInterpolation = scanStringLiteral(
    '"""{{ first\n+second }}"""',
    0,
    1,
    1,
  );
  assert.equal(multilineInterpolation.line, 2);

  assert.throws(
    () => scanStringLiteral('"\\', 0, 1, 1),
    /Unknown string escape sequence/,
  );
  assert.doesNotThrow(() => scanStringLiteral('"{{ } value }}"', 0, 1, 1));
  assert.doesNotThrow(() => scanStringLiteral('"{{ """" }}"', 0, 1, 1));
});
