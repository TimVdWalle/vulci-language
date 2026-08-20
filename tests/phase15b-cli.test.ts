// Phase: Branding exploration after Phase 17

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
import { TokenType } from "../src/token.js";
import { VULCI_VERSION } from "../src/version.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const vulciCli = path.join(projectRoot, "src", "cli.ts");
const smokeFile = path.join(projectRoot, "examples", "smoke.vci");
const debugFile = path.join(projectRoot, "examples", "phase15", "1.vci");
const packageJson = JSON.parse(
  readFileSync(path.join(projectRoot, "package.json"), "utf8"),
) as { version: string };
const escapedVersion = packageJson.version.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&",
);
const wordmarkGradient = [
  "\u001B[1;38;2;160;90;247m",
  "\u001B[1;38;2;181;91;228m",
  "\u001B[1;38;2;202;91;210m",
  "\u001B[1;38;2;223;92;191m",
  "\u001B[1;38;2;244;92;172m",
] as const;
const ansiReset = "\u001B[0m";

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
    assert.match(result.stdout, new RegExp(`^Vulci ${escapedVersion}`, "m"));
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
    assert.equal(result.stdout, `Vulci ${packageJson.version}\n`);
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

test("formats unknown and over-wide token rows defensively", () => {
  const style = createCliStyle(false);

  assert.match(
    formatTokens(
      [{ type: -1 as TokenType, lexeme: "?", line: 1, column: 1 }],
      style,
    ),
    /Unknown/,
  );

  const overWideTokens: Parameters<typeof formatTokens>[0] = [];
  overWideTokens.map = (() => [
    ["Integer", "1", "1", "1", "extra"],
  ]) as unknown as typeof overWideTokens.map;
  assert.match(
    formatTokens(overWideTokens, style),
    /Integer\s+1\s+1\s+1\s+extra/,
  );
  assert.throws(
    () =>
      formatTokens(
        [
          {
            type: TokenType.Integer,
            lexeme: undefined as unknown as string,
            line: 1,
            column: 1,
          },
        ],
        style,
      ),
    TypeError,
  );
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
  const plainHelp = formatHelp(plain);
  const colouredHelp = formatHelp(coloured);
  const expectedWordmark = [..."Vulci"]
    .map((letter, index) => `${wordmarkGradient[index]}${letter}${ansiReset}`)
    .join("");

  assert.match(plainHelp, new RegExp(`^Vulci ${escapedVersion}`));
  assert.equal(
    [...wordmarkGradient, ansiReset].reduce(
      (output, code) => output.replaceAll(code, ""),
      colouredHelp,
    ),
    plainHelp,
  );
  assert.equal(formatVersion(), `Vulci ${packageJson.version}\n`);
  assert.equal(formatTokens(tokens, plain).includes("\u001B["), false);
  assert.equal(formatAst(program, plain, false).includes("\u001B["), false);
  assert.equal(colouredHelp.startsWith(expectedWordmark), true);
  assert.equal(
    colouredHelp.includes("\u001B[1;38;2;160;90;247mUsage\u001B[0m"),
    true,
  );
  assert.equal(
    colouredHelp.includes("\u001B[1;38;2;244;92;172m-h, --help\u001B[0m"),
    true,
  );
  assert.equal(
    formatTokens(tokens, coloured).includes("\u001B[1;38;2;160;90;247mTokens"),
    true,
  );
  assert.equal(
    formatAst(program, coloured, true).includes("\u001B[1;38;2;160;90;247mAST"),
    true,
  );
  assert.match(formatCliError(new Error("failure")), /failure/);
  assert.equal(formatCliError("failure"), "An unknown error occurred.");
});

test("keeps package and command-line versions aligned", () => {
  assert.equal(packageJson.version, VULCI_VERSION);
});
