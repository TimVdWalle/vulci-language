// Phase 15

import {
  AssignmentExpression,
  BinaryExpression,
  ComparisonChainExpression,
  Expression,
  TypeInspectionExpression,
  UnaryExpression,
} from "../ast.js";
import { Token, TokenType } from "../token.js";
import { PrimaryExpressionParser } from "./primary-expression-parser.js";

export abstract class ExpressionParser extends PrimaryExpressionParser {
  protected expression(): Expression {
    return this.assignment();
  }

  protected assignment(): Expression {
    const expression = this.or();

    if (!this.match(TokenType.Assign)) {
      return expression;
    }

    const operator = this.previous();

    this.skipNewlines();

    const value = this.assignment();

    if (expression.type === "VariableReference") {
      const node: AssignmentExpression = {
        type: "AssignmentExpression",
        name: expression.name,
        value,
      };

      return node;
    }

    if (expression.type === "MemberAccess") {
      const node: AssignmentExpression = {
        type: "AssignmentExpression",
        target: expression,
        value,
      };

      return node;
    }

    throw this.error(operator, "Invalid assignment target.");
  }

  protected or(): Expression {
    let expression = this.and();

    while (true) {
      this.skipNewlinesBefore(TokenType.Or);

      if (!this.match(TokenType.Or)) {
        break;
      }

      const operator = this.previous();

      this.skipNewlines();

      const right = this.and();

      const node: BinaryExpression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };

      expression = node;
    }

    return expression;
  }

  protected and(): Expression {
    let expression = this.not();

    while (true) {
      this.skipNewlinesBefore(TokenType.And);

      if (!this.match(TokenType.And)) {
        break;
      }

      const operator = this.previous();

      this.skipNewlines();

      const right = this.not();

      const node: BinaryExpression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };

      expression = node;
    }

    return expression;
  }

  protected not(): Expression {
    if (this.match(TokenType.Not)) {
      const operator = this.previous();

      this.skipNewlines();

      const node: UnaryExpression = {
        type: "UnaryExpression",
        operator,
        operand: this.not(),
      };

      return node;
    }

    return this.comparison();
  }

  protected comparison(): Expression {
    const operands: Expression[] = [this.addition()];
    const operators: Token[] = [];

    let category: "equality" | "ordering" | null = null;

    while (true) {
      this.skipNewlinesBefore(
        TokenType.Is,
        TokenType.EqualEqual,
        TokenType.BangEqual,
        TokenType.Less,
        TokenType.LessEqual,
        TokenType.Greater,
        TokenType.GreaterEqual,
      );

      if (this.match(TokenType.Is)) {
        const operator = this.previous();

        if (operators.length > 0) {
          throw this.error(
            operator,
            "'is' cannot be combined with another comparison operator without parentheses.",
          );
        }

        this.skipNewlines();

        if (this.check(TokenType.Pipe)) {
          throw this.error(this.peek(), "A union type cannot start with '|'.");
        }

        const firstType = this.consumeTypeName("Expected a type after 'is'.");
        const inspectedType = this.finishTypeAnnotation(firstType);

        this.skipNewlinesBefore(
          TokenType.Is,
          TokenType.EqualEqual,
          TokenType.BangEqual,
          TokenType.Less,
          TokenType.LessEqual,
          TokenType.Greater,
          TokenType.GreaterEqual,
        );

        if (
          this.check(TokenType.Is) ||
          this.isComparisonOperator(this.peek().type)
        ) {
          throw this.error(
            this.peek(),
            "'is' cannot be combined with another comparison operator without parentheses.",
          );
        }

        const node: TypeInspectionExpression = {
          type: "TypeInspectionExpression",
          value: operands[0]!,
          operator,
          inspectedType,
        };

        return node;
      }

      if (!this.isComparisonOperator(this.peek().type)) {
        break;
      }

      const operator = this.advance();
      const operatorCategory = this.comparisonCategory(operator.type);

      if (category !== null && category !== operatorCategory) {
        throw this.error(
          operator,
          "Equality and ordering operators cannot be mixed in one comparison chain.",
        );
      }

      category = operatorCategory;
      operators.push(operator);

      this.skipNewlines();

      operands.push(this.addition());
    }

    if (operators.length === 0) {
      return operands[0]!;
    }

    if (operators.length === 1) {
      const node: BinaryExpression = {
        type: "BinaryExpression",
        left: operands[0]!,
        operator: operators[0]!,
        right: operands[1]!,
      };

      return node;
    }

    const node: ComparisonChainExpression = {
      type: "ComparisonChainExpression",
      operands,
      operators,
    };

    return node;
  }

  protected addition(): Expression {
    let expression = this.multiplication();

    while (true) {
      this.skipNewlinesBefore(TokenType.Plus, TokenType.Minus, TokenType.Tilde);

      if (!this.match(TokenType.Plus, TokenType.Minus, TokenType.Tilde)) {
        break;
      }

      const operator = this.previous();

      this.skipNewlines();

      const right = this.multiplication();

      const node: BinaryExpression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };

      expression = node;
    }

    return expression;
  }

  protected multiplication(): Expression {
    let expression = this.unary();

    while (true) {
      this.skipNewlinesBefore(
        TokenType.Star,
        TokenType.Slash,
        TokenType.Percent,
      );

      if (!this.match(TokenType.Star, TokenType.Slash, TokenType.Percent)) {
        break;
      }

      const operator = this.previous();

      this.skipNewlines();

      const right = this.unary();

      const node: BinaryExpression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };

      expression = node;
    }

    return expression;
  }

  protected unary(): Expression {
    if (this.match(TokenType.Minus)) {
      const operator = this.previous();

      if (this.check(TokenType.Minus)) {
        throw this.error(
          this.peek(),
          "Repeated negation requires parentheses.",
        );
      }

      this.skipNewlines();

      const node: UnaryExpression = {
        type: "UnaryExpression",
        operator,
        operand: this.primary(),
      };

      return node;
    }

    return this.postfix();
  }
}
