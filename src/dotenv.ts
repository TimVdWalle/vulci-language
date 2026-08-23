// Phase 19

const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type EnvironmentNameComparison = "case-sensitive" | "case-insensitive";

export interface EnvironmentEntry {
  name: string;
  value: string;
}

export function parseDotenv(
  contents: Uint8Array,
  filePath: string,
  comparison: EnvironmentNameComparison,
): EnvironmentEntry[] {
  const text = decodeUtf8(contents, filePath);
  const lines = text.split("\n");
  const entries: EnvironmentEntry[] = [];
  const names = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = stripLineEnding(
      lines[index]!,
      index < lines.length - 1,
      filePath,
      lineNumber,
    );

    if (line.trim().length === 0 || line.trimStart().startsWith("#")) {
      continue;
    }

    const delimiter = line.indexOf("=");

    if (delimiter < 0) {
      throw formatError(filePath, lineNumber, "entry must contain '='");
    }

    const name = line.slice(0, delimiter);

    if (!isValidEnvironmentName(name)) {
      throw formatError(filePath, lineNumber, "invalid environment name");
    }

    const comparisonName = normalizeEnvironmentName(name, comparison);

    if (names.has(comparisonName)) {
      throw formatError(filePath, lineNumber, `duplicate name '${name}'`);
    }

    names.add(comparisonName);
    entries.push({
      name,
      value: parseValue(line.slice(delimiter + 1), filePath, lineNumber),
    });
  }

  return entries;
}

export function normalizeEnvironmentName(
  name: string,
  comparison: EnvironmentNameComparison,
): string {
  return comparison === "case-insensitive" ? name.toUpperCase() : name;
}

export function isValidEnvironmentName(name: string): boolean {
  return ENVIRONMENT_NAME.test(name);
}

function decodeUtf8(contents: Uint8Array, filePath: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(contents);
  } catch {
    throw new Error(
      `E_ENV_FILE_FORMAT: Environment file '${filePath}' is not valid UTF-8.`,
    );
  }
}

function stripLineEnding(
  line: string,
  terminatedByLineFeed: boolean,
  filePath: string,
  lineNumber: number,
): string {
  if (line.endsWith("\r") && terminatedByLineFeed) return line.slice(0, -1);

  if (line.includes("\r")) {
    throw formatError(filePath, lineNumber, "unsupported line ending");
  }

  return line;
}

function parseValue(
  value: string,
  filePath: string,
  lineNumber: number,
): string {
  const quote = value[0];

  if (quote !== '"' && quote !== "'") return value;

  const closingIndex = value.indexOf(quote, 1);

  if (closingIndex < 0 || closingIndex !== value.length - 1) {
    throw formatError(filePath, lineNumber, "invalid quoted value");
  }

  return value.slice(1, -1);
}

function formatError(
  filePath: string,
  lineNumber: number,
  detail: string,
): Error {
  return new Error(
    `E_ENV_FILE_FORMAT: ${detail} in '${filePath}' at line ${lineNumber}.`,
  );
}
