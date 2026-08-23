// Phase 19

import { readFile } from "node:fs/promises";
import path from "node:path";
import { registerBuiltins } from "./builtins.js";
import { parseCliArguments } from "./cli-arguments.js";
import {
  createCliStyle,
  formatAst,
  formatCliError,
  formatHelp,
  formatTokens,
  formatVersion,
  shouldUseColor,
} from "./cli-output.js";
import { Environment } from "./environment.js";
import { Evaluator } from "./evaluator.js";
import {
  ExecutionEnvironment,
  HostEnvironment,
  platformEnvironmentNameComparison,
} from "./execution-environment.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";

export interface CliDependencies {
  hostEnvironment?: HostEnvironment;
  platform?: NodeJS.Platform;
}

export async function runCli(
  arguments_: string[],
  dependencies: CliDependencies = {},
): Promise<number> {
  let options;

  try {
    options = parseCliArguments(arguments_);
  } catch (error) {
    console.error(`${formatCliError(error)} Run 'vulci --help' for usage.`);
    return 1;
  }

  const hostEnvironment = dependencies.hostEnvironment ?? process.env;
  const useColor = shouldUseColor(
    options.noColor,
    hostEnvironment.NO_COLOR,
    process.stdout,
  );
  const style = createCliStyle(useColor);

  if (options.action === "help") {
    process.stdout.write(formatHelp(style));
    return 0;
  }

  if (options.action === "version") {
    process.stdout.write(formatVersion());
    return 0;
  }

  const entryPath = options.entryPath!;
  const filePath = entryPath === "." ? path.join(".", "main.vci") : entryPath;

  try {
    const source = await readFile(filePath, "utf8");
    const tokens = new Lexer(source).lex();

    if (options.showTokens) {
      process.stdout.write(formatTokens(tokens, style));
    }

    const program = new Parser(tokens).parse();

    if (options.showAst) {
      process.stdout.write(formatAst(program, style, useColor));
    }

    const environment = new Environment();
    const envFilePath = path.join(path.dirname(path.resolve(filePath)), ".env");
    const executionEnvironment = new ExecutionEnvironment(
      hostEnvironment,
      envFilePath,
      platformEnvironmentNameComparison(dependencies.platform),
    );
    registerBuiltins(environment, executionEnvironment);
    new Evaluator(environment).evaluate(program, filePath);
    return 0;
  } catch (error) {
    console.error(formatCliError(error));
    return 1;
  }
}
