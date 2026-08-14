// Phase 15B

import { inspect } from "node:util";
import { Program } from "./ast.js";
import { Token, TokenType } from "./token.js";
import { VULCI_VERSION } from "./version.js";

const ansi = {
  boldCyan: "\u001B[1;36m",
  boldGreen: "\u001B[1;32m",
  reset: "\u001B[0m",
} as const;

export interface ColorOutput {
  hasColors?: () => boolean;
  isTTY?: boolean;
}

export interface CliStyle {
  heading(value: string): string;
  option(value: string): string;
}

export function shouldUseColor(
  noColorOption: boolean,
  noColorEnvironment: string | undefined,
  output: ColorOutput,
): boolean {
  return (
    !noColorOption &&
    !noColorEnvironment &&
    output.isTTY === true &&
    output.hasColors?.() === true
  );
}

export function createCliStyle(useColor: boolean): CliStyle {
  return {
    heading: (value) => style(value, ansi.boldCyan, useColor),
    option: (value) => style(value, ansi.boldGreen, useColor),
  };
}

export function formatHelp(style: CliStyle): string {
  return `${style.heading("Vulci")} ${VULCI_VERSION}

${style.heading("Usage")}
  vulci . [options]
  vulci <source-file> [options]
  vulci --help
  vulci --version

${style.heading("Entry path")}
  .                     Run ./main.vci
  <source-file>         Run the selected .vci file

${style.heading("Options")}
  ${style.option("-h, --help")}            Show this help
  ${style.option("-v, --version")}         Show the Vulci version
  ${style.option("--tokens")}              Show lexer tokens before execution
  ${style.option("--ast")}                 Show the parsed AST before execution
  ${style.option("--no-color")}            Disable coloured CLI output
`;
}

export function formatVersion(): string {
  return `Vulci ${VULCI_VERSION}\n`;
}

export function formatTokens(tokens: Token[], style: CliStyle): string {
  const rows = tokens.map((token) => [
    TokenType[token.type] ?? "Unknown",
    JSON.stringify(token.lexeme),
    String(token.line),
    String(token.column),
  ]);
  const headings = ["Type", "Lexeme", "Line", "Column"];
  const widths = headings.map((heading, column) =>
    Math.max(heading.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );
  const table = [headings, ...rows]
    .map((row) =>
      row.map((value, column) => value.padEnd(widths[column] ?? 0)).join("  "),
    )
    .join("\n");

  return `\n${style.heading("Tokens")}\n${table}\n`;
}

export function formatAst(
  program: Program,
  style: CliStyle,
  useColor: boolean,
): string {
  return `\n${style.heading("AST")}\n${inspect(program, {
    colors: useColor,
    compact: false,
    depth: null,
  })}\n`;
}

export function formatCliError(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred.";
}

function style(value: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${value}${ansi.reset}` : value;
}
