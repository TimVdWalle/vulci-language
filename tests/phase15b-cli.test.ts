// Phase 16

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CliArgumentError, parseCliArguments } from "../src/cli-arguments.js";
import {
  createCliStyle,
  formatAst,
  formatCliError,
  formatHelp,
  formatTokens,
  formatVersion,
  shouldUseColor,
} from "../src/cli-output.js";
import { Lexer } from "../src/lexer.js";
import { VULCI_VERSION } from "../src/version.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const vulciCli = path.join(projectRoot, "src", "cli.ts");
const smokeFile = path.join(projectRoot, "examples", "smoke.vci");
const debugFile = path.join(projectRoot, "examples", "phase15", "1.vci");

function runCli(...arguments_: string[]) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", vulciCli, ...arguments_],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
}

test("shows help through both accepted options without an entry path", () => {
  for (const option of ["--help", "-h"]) {
    const result = runCli(option);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Vulci 0\.16\.0/m);
    assert.match(result.stdout, /^Usage$/m);
    assert.match(result.stdout, /--tokens/);
    assert.match(result.stdout, /--no-color/);
    assert.equal(result.stderr, "");
  }
});

test("shows the version through both accepted options without an entry path", () => {
  for (const option of ["--version", "-v"]) {
    const result = runCli(option);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "Vulci 0.16.0\n");
    assert.equal(result.stderr, "");
  }
});

test("reports invalid command-line input with help guidance", () => {
  const cases = [
    { arguments: [], message: "Missing entry path." },
    { arguments: ["--unknown"], message: "Unknown option '--unknown'." },
    {
      arguments: [smokeFile, smokeFile],
      message: "Only one entry path is allowed",
    },
    {
      arguments: ["--help", "--version"],
      message: "Help and version options cannot be combined.",
    },
  ];

  for (const testCase of cases) {
    const result = runCli(...testCase.arguments);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(testCase.message));
    assert.match(result.stderr, /vulci --help/);
  }
});

test("prints consistent token and AST debug output", () => {
  const result = runCli(debugFile, "--tokens", "--ast", "--no-color");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Tokens$/m);
  assert.match(result.stdout, /^Type\s+Lexeme\s+Line\s+Column$/m);
  assert.doesNotMatch(result.stdout, /^Literal\s+/im);
  assert.match(result.stdout, /^AST$/m);
  assert.match(result.stdout, /type: 'Program'/);
  assert.equal(result.stdout.includes("\u001B["), false);
});

test("parses options independently from their order", () => {
  assert.deepEqual(
    parseCliArguments(["--tokens", "--ast", "--no-color", "program.vci"]),
    {
      action: "run",
      entryPath: "program.vci",
      noColor: true,
      showAst: true,
      showTokens: true,
    },
  );
  assert.equal(parseCliArguments(["program.vci", "--help"]).action, "help");
  assert.equal(parseCliArguments(["--help", "-h"]).action, "help");
  assert.throws(() => parseCliArguments(["-missing"]), CliArgumentError);
});

test("enables colour only for a capable terminal without an override", () => {
  const capableOutput = { isTTY: true, hasColors: () => true };

  assert.equal(shouldUseColor(false, undefined, capableOutput), true);
  assert.equal(shouldUseColor(true, undefined, capableOutput), false);
  assert.equal(shouldUseColor(false, "1", capableOutput), false);
  assert.equal(
    shouldUseColor(false, undefined, { isTTY: false, hasColors: () => true }),
    false,
  );
  assert.equal(shouldUseColor(false, undefined, { isTTY: true }), false);
  assert.equal(
    shouldUseColor(false, undefined, { isTTY: true, hasColors: () => false }),
    false,
  );
});

test("formats plain and coloured CLI output consistently", () => {
  const plain = createCliStyle(false);
  const coloured = createCliStyle(true);
  const tokens = new Lexer("42").lex();
  const program = {
    type: "Program" as const,
    statements: [],
  };

  assert.match(formatHelp(plain), /^Vulci 0\.16\.0/);
  assert.equal(formatVersion(), "Vulci 0.16.0\n");
  assert.equal(formatTokens(tokens, plain).includes("\u001B["), false);
  assert.equal(formatAst(program, plain, false).includes("\u001B["), false);
  assert.equal(formatHelp(coloured).includes("\u001B[1;36mVulci"), true);
  assert.equal(
    formatTokens(tokens, coloured).includes("\u001B[1;36mTokens"),
    true,
  );
  assert.equal(
    formatAst(program, coloured, true).includes("\u001B[1;36mAST"),
    true,
  );
  assert.match(formatCliError(new Error("failure")), /failure/);
  assert.equal(formatCliError("failure"), "An unknown error occurred.");
});

test("keeps package and command-line versions aligned", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(projectRoot, "package.json"), "utf8"),
  ) as { version: string };

  assert.equal(VULCI_VERSION, "0.16.0");
  assert.equal(packageJson.version, VULCI_VERSION);
});
