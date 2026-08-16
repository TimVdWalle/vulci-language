// Phase 13

import assert from "node:assert/strict";
import test from "node:test";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

test("parses objects, trailing commas, and chained member access", () => {
  const program = parse(`
user = object(
  name: "Tim",
  address: object(city: "Rome"),
)
user.address.city
`);
  const assignment = program.statements[0]!.expression;
  assert.equal(assignment.type, "AssignmentExpression");
  if (assignment.type !== "AssignmentExpression") return;
  assert.equal(assignment.value.type, "AnonymousObjectLiteral");

  const access = program.statements[1]!.expression;
  assert.equal(access.type, "MemberAccess");
  if (access.type !== "MemberAccess") return;
  assert.equal(access.member.lexeme, "city");
  assert.equal(access.receiver.type, "MemberAccess");
});

test("rejects empty anonymous objects", () => {
  assert.throws(() => parse("object()"), /E_OBJ_EMPTY/);
});

test("rejects duplicate anonymous-object fields", () => {
  assert.throws(
    () => parse("object(name: 1, name: 2)"),
    /E_OBJ_DUP: Duplicate object field 'name'/,
  );
});

test("parses direct and nested member assignment targets", () => {
  const direct = parse("user.name = 1").statements[0]!.expression;
  assert.equal(direct.type, "AssignmentExpression");
  if (direct.type !== "AssignmentExpression" || !("target" in direct)) return;
  assert.equal(direct.target.member.lexeme, "name");

  const nested = parse("user.address.city = 1").statements[0]!.expression;
  assert.equal(nested.type, "AssignmentExpression");
  if (nested.type !== "AssignmentExpression" || !("target" in nested)) return;
  assert.equal(nested.target.member.lexeme, "city");
  assert.equal(nested.target.receiver.type, "MemberAccess");
});

test("rejects malformed object fields", () => {
  assert.throws(() => parse("object(, value: 1)"), /Expected object field/);
  assert.throws(() => parse("object(: 1)"), /Expected object field name/);
  assert.throws(() => parse("object(name 1)"), /Expected ':'/);
  assert.throws(() => parse("object(name:)"), /Expected expression/);
  assert.throws(() => parse("object(name: 1 age: 2)"), /Expected '\)'/);
});
