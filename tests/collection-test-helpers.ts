// Phase 16

import { Program } from "../src/ast.js";
import { registerBuiltins } from "../src/builtins.js";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";

export function parseCollectionSource(source: string): Program {
  return new Parser(new Lexer(source).lex()).parse();
}

export function evaluateCollectionSource(
  source: string,
  environment = new Environment(),
): RuntimeValue {
  return new Evaluator(environment).evaluate(parseCollectionSource(source));
}

export function evaluateCollectionSourceWithBuiltins(
  source: string,
): RuntimeValue {
  const environment = new Environment();
  registerBuiltins(environment);
  return evaluateCollectionSource(source, environment);
}
