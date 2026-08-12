// Phase 15

import { readFile } from "node:fs/promises";
import path from "node:path";
import { registerBuiltins } from "./builtins.js";
import { Environment } from "./environment.js";
import { Evaluator } from "./evaluator.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { TokenType } from "./token.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const entryPath = args.find((argument) => !argument.startsWith("--"));

  const showTokens = args.includes("--tokens");

  const showAst = args.includes("--ast");

  if (!entryPath) {
    console.error("Usage: vulci . | vulci <source-file> [--tokens] [--ast]");

    process.exitCode = 1;

    return;
  }

  const filePath = entryPath === "." ? path.join(".", "main.vci") : entryPath;

  try {
    const source = await readFile(filePath, "utf8");

    const lexer = new Lexer(source);

    const tokens = lexer.lex();

    if (showTokens) {
      console.log("\nTokens:");

      console.table(
        tokens.map((token) => ({
          type: TokenType[token.type],

          lexeme: token.lexeme,

          literal: token.type,

          line: token.line,
        })),
      );
    }

    const parser = new Parser(tokens);

    const program = parser.parse();

    if (showAst) {
      console.log("\nAST:");

      console.dir(program, {
        depth: null,

        colors: true,
      });
    }

    const environment = new Environment();

    registerBuiltins(environment);

    const evaluator = new Evaluator(environment);

    evaluator.evaluate(program, filePath);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("An unknown error occurred.");
    }

    process.exitCode = 1;
  }
}

void main();
