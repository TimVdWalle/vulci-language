// Phase 18

import assert from "node:assert/strict";
import test from "node:test";
import { Expression } from "../src/ast.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

class AssignmentProbe extends Parser {
  public hasAssignment(expression: Expression): boolean {
    return this.containsAssignment(expression);
  }
}

function parseExpression(source: string): Expression {
  const program = new Parser(new Lexer(source).lex()).parse();
  const statement = program.statements[0];
  assert.equal(statement?.type, "ExpressionStatement");
  if (statement?.type !== "ExpressionStatement") assert.fail();
  return statement.expression;
}

test("detects assignments throughout loop expression shapes", () => {
  const probe = new AssignmentProbe(new Lexer("null").lex());

  assert.equal(probe.hasAssignment(parseExpression("1.times() { }")), false);
  assert.equal(
    probe.hasAssignment(parseExpression("($value = 1).times() { }")),
    true,
  );
  assert.equal(
    probe.hasAssignment(parseExpression("1.times() { $value = 1 }")),
    true,
  );

  assert.equal(
    probe.hasAssignment(parseExpression("while (false) { }")),
    false,
  );
  assert.equal(
    probe.hasAssignment(parseExpression("while ($value = true) { }")),
    true,
  );
  assert.equal(
    probe.hasAssignment(parseExpression("while (false) { $value = 1 }")),
    true,
  );

  const loop = parseExpression("while (true) { break }");
  assert.equal(loop.type, "WhileExpression");
  if (loop.type !== "WhileExpression") assert.fail();
  assert.equal(probe.hasAssignment(loop.expressions[0]!), false);
});
