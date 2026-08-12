// Phase 15

import {
  ExpressionStatement,
  ImportStatement,
  Program,
  Statement,
} from "./ast.js";
import { ExpressionParser } from "./parser/expression-parser.js";
import { ParserOptions } from "./parser/parser-context.js";
import { Token, TokenType } from "./token.js";

export class Parser extends ExpressionParser {
  constructor(tokens: Token[], options: ParserOptions = {}) {
    super(tokens, options);
    this.discoverStructNames(tokens);
    this.discoverEnumNames(tokens);
  }

  public parseSingleExpression() {
    this.skipNewlines();
    const expression = this.expression();
    this.skipNewlines();
    this.consume(TokenType.EOF, "Expected end of interpolation expression.");
    return expression;
  }

  public parse(): Program {
    const statements: Statement[] = [];
    let encounteredNonImport = false;

    this.skipNewlines();

    while (!this.isAtEnd()) {
      const statement = this.statement();

      if (statement.type === "ImportStatement") {
        if (encounteredNonImport) {
          throw this.error(
            statement.keyword,
            "Imports must form a leading top-level block.",
          );
        }
      } else {
        encounteredNonImport = true;
      }

      statements.push(statement);
      this.consumeStatementEnd();
      this.skipNewlines();
    }

    return { type: "Program", statements };
  }

  protected statement(): Statement {
    if (this.match(TokenType.Import)) {
      return this.importStatement(this.previous());
    }

    if (this.match(TokenType.Enum)) {
      return {
        type: "ExpressionStatement",
        expression: this.enumDeclaration(this.previous()),
      };
    }

    if (this.match(TokenType.Struct)) {
      return {
        type: "ExpressionStatement",
        expression: this.structDeclaration(this.previous()),
      };
    }

    if (this.match(TokenType.Fn)) {
      return {
        type: "ExpressionStatement",
        expression: this.functionDeclaration(this.previous()),
      };
    }

    return this.expressionStatement();
  }

  protected expressionStatement(): ExpressionStatement {
    return { type: "ExpressionStatement", expression: this.expression() };
  }

  private importStatement(keyword: Token): ImportStatement {
    const pathToken = this.consume(
      TokenType.String,
      "Expected a single-quoted source path after 'import'.",
    );

    if (
      !pathToken.lexeme.startsWith("'") ||
      pathToken.lexeme.startsWith("'''")
    ) {
      throw this.error(
        pathToken,
        "Import paths must use a single-line, single-quoted string literal.",
      );
    }

    const segments = pathToken.stringSegments ?? [];

    if (segments.some((segment) => segment.type !== "Text")) {
      throw this.error(pathToken, "Import paths cannot use interpolation.");
    }

    const sourcePath = segments
      .map((segment) => (segment.type === "Text" ? segment.value : ""))
      .join("");

    if (!sourcePath.endsWith(".vci")) {
      throw this.error(
        pathToken,
        "Import paths must include the '.vci' extension.",
      );
    }

    if (/^(?:\/|[A-Za-z]:\/)/u.test(sourcePath)) {
      throw this.error(pathToken, "Import paths must be relative.");
    }

    if (sourcePath.includes("\\")) {
      throw this.error(pathToken, "Import path segments must use '/'.");
    }

    return {
      type: "ImportStatement",
      keyword,
      pathToken,
      path: sourcePath,
    };
  }

  private discoverStructNames(tokens: Token[]): void {
    let braceDepth = 0;

    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]!;

      if (token.type === TokenType.LeftBrace) {
        braceDepth++;
        continue;
      }

      if (token.type === TokenType.RightBrace) {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }

      if (token.type !== TokenType.Struct || braceDepth !== 0) continue;

      const name = tokens[index + 1];
      if (name?.type === TokenType.Identifier) {
        this.registerStructName(name.lexeme);
      }
    }
  }

  private discoverEnumNames(tokens: Token[]): void {
    let braceDepth = 0;

    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]!;

      if (token.type === TokenType.LeftBrace) {
        braceDepth++;
        continue;
      }

      if (token.type === TokenType.RightBrace) {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }

      if (token.type !== TokenType.Enum || braceDepth !== 0) continue;

      const name = tokens[index + 1];
      if (name?.type === TokenType.Identifier) {
        this.registerEnumName(name.lexeme);
      }
    }
  }
}
