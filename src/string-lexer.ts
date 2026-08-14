// Phase 15B

import { locatedError } from "./diagnostics/source-error.js";
import { ScannedStringSegment } from "./token.js";

export interface StringScanResult {
  end: number;
  line: number;
  column: number;
  lexeme: string;
  segments: ScannedStringSegment[];
}

export function scanStringLiteral(
  source: string,
  start: number,
  startLine: number,
  startColumn: number,
): StringScanResult {
  const quote = source[start]!;
  const multiline = source.slice(start, start + 3) === quote.repeat(3);
  const interpolates = quote === '"';
  const delimiterLength = multiline ? 3 : 1;
  const contentStart = start + delimiterLength;

  let current = contentStart;
  let line = startLine;
  let column = startColumn + delimiterLength;
  let text = "";
  const segments: ScannedStringSegment[] = [];

  const pushText = (): void => {
    if (text.length > 0) {
      segments.push({ type: "Text", value: text });
      text = "";
    }
  };

  while (current < source.length) {
    if (
      source.slice(current, current + delimiterLength) ===
      quote.repeat(delimiterLength)
    ) {
      const end = current + delimiterLength;
      pushText();

      const normalized = multiline
        ? normalizeMultilineSegments(segments)
        : segments;

      return {
        end,
        line,
        column: column + delimiterLength,
        lexeme: source.slice(start, end),
        segments: normalized,
      };
    }

    const character = source[current]!;

    if (!multiline && character === "\n") {
      throw locatedError(
        line,
        column,
        "Raw newline in single-line string.",
        "E_STR_NL",
      );
    }

    if (character === "\\") {
      const escaped = source[current + 1];
      const values: Record<string, string> = {
        n: "\n",
        t: "\t",
        r: "\r",
        "\\": "\\",
        '"': '"',
        "'": "'",
      };

      if (escaped === undefined || values[escaped] === undefined) {
        throw locatedError(
          line,
          column,
          "Unknown string escape sequence.",
          "E_STR_ESC",
        );
      }

      text += values[escaped];
      current += 2;
      column += 2;
      continue;
    }

    if (interpolates && source.slice(current, current + 2) === "}}") {
      throw locatedError(
        line,
        column,
        "Closing interpolation delimiter has no matching opening delimiter.",
        "E_IPL_CLOSE",
      );
    }

    if (interpolates && source.slice(current, current + 2) === "{{") {
      pushText();
      const interpolation = scanInterpolation(
        source,
        current + 2,
        line,
        column + 2,
      );

      if (interpolation.source.trim().length === 0) {
        throw locatedError(
          line,
          column,
          "Interpolation expression cannot be empty.",
          "E_IPL_EMPTY",
        );
      }

      segments.push({
        type: "Interpolation",
        source: interpolation.source,
        line,
        column: column + 2,
      });

      current = interpolation.end;
      line = interpolation.line;
      column = interpolation.column;
      continue;
    }

    text += character;
    current++;

    if (character === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  throw locatedError(
    startLine,
    startColumn,
    "Unterminated string literal.",
    "E_STR_UNCLOSED",
  );
}

function scanInterpolation(
  source: string,
  start: number,
  startLine: number,
  startColumn: number,
): { source: string; end: number; line: number; column: number } {
  let current = start;
  let line = startLine;
  let column = startColumn;
  let braceDepth = 0;
  let quote: string | null = null;

  while (current < source.length) {
    const character = source[current]!;

    if (quote !== null) {
      if (character === "\\") {
        current += 2;
        column += 2;
        continue;
      }

      if (source.slice(current, current + 3) === quote.repeat(3)) {
        current += 3;
        column += 3;
        quote = null;
        continue;
      }

      if (character === quote) {
        current++;
        column++;
        quote = null;
        continue;
      }
    } else {
      if (character === '"' || character === "'") {
        quote = character;
      } else if (
        source.slice(current, current + 2) === "}}" &&
        braceDepth === 0
      ) {
        return {
          source: source.slice(start, current),
          end: current + 2,
          line,
          column: column + 2,
        };
      } else if (character === "{") {
        braceDepth++;
      } else if (character === "}") {
        if (braceDepth > 0) {
          braceDepth--;
        }
      }
    }

    current++;

    if (character === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  throw locatedError(
    startLine,
    startColumn - 2,
    "Unterminated interpolation.",
    "E_IPL_UNCLOSED",
  );
}

function normalizeMultilineSegments(
  segments: ScannedStringSegment[],
): ScannedStringSegment[] {
  const markerStart = "\u0000";
  const markerEnd = "\u0001";
  const interpolationSegments = segments.filter(
    (
      segment,
    ): segment is Extract<ScannedStringSegment, { type: "Interpolation" }> =>
      segment.type === "Interpolation",
  );
  let combined = "";
  let interpolationIndex = 0;

  for (const segment of segments) {
    if (segment.type === "Text") {
      combined += segment.value;
    } else {
      combined += `${markerStart}${interpolationIndex}${markerEnd}`;
      interpolationIndex++;
    }
  }

  if (combined.startsWith("\n")) {
    combined = combined.slice(1);
  }

  if (combined.endsWith("\n")) {
    combined = combined.slice(0, -1);
  }

  const lines = combined.split("\n");
  const prefixes = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => /^[ \t]*/.exec(line)![0]);
  const commonPrefix = prefixes.reduce(
    commonWhitespacePrefix,
    prefixes[0] ?? "",
  );
  combined = lines
    .map((line) =>
      line.trim().length === 0 ? line : line.slice(commonPrefix.length),
    )
    .join("\n");

  const result: ScannedStringSegment[] = [];
  const markerPattern = new RegExp(`${markerStart}(\\d+)${markerEnd}`, "g");
  let cursor = 0;

  for (const match of combined.matchAll(markerPattern)) {
    const index = match.index;

    if (index > cursor) {
      result.push({ type: "Text", value: combined.slice(cursor, index) });
    }

    const segment = interpolationSegments[Number(match[1])]!;

    result.push(segment);

    cursor = index + match[0].length;
  }

  if (cursor < combined.length) {
    result.push({ type: "Text", value: combined.slice(cursor) });
  }

  return result;
}

function commonWhitespacePrefix(left: string, right: string): string {
  let length = 0;

  while (length < left.length && left[length] === right[length]) {
    length++;
  }

  return left.slice(0, length);
}
