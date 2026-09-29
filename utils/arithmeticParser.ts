import { ErrorReporter } from "@/utils/errorReporter.ts"

type NumericVariables = Map<string, string | number | boolean>

class ArithmeticParser {
  private index = 0

  constructor(
    private readonly expression: string,
    private readonly variables: NumericVariables,
    private readonly errorReporter?: ErrorReporter,
  ) {}

  parse(): number | null {
    const value = this.parseExpression()
    this.skipWhitespace()

    if (value === null || this.index !== this.expression.length) {
      this.report(`Invalid arithmetic expression: ${this.expression}`)
      return null
    }

    return value
  }

  private parseExpression(): number | null {
    let value = this.parseTerm()

    while (value !== null) {
      this.skipWhitespace()
      const operator = this.expression[this.index]
      if (operator !== "+" && operator !== "-") break

      this.index++
      const right = this.parseTerm()
      if (right === null) return null
      value = operator === "+" ? value + right : value - right
    }

    return value
  }

  private parseTerm(): number | null {
    let value = this.parseUnary()

    while (value !== null) {
      this.skipWhitespace()
      const operator = this.expression[this.index]
      if (operator !== "*" && operator !== "/") break

      this.index++
      const right = this.parseUnary()
      if (right === null) return null

      if (operator === "/" && right === 0) {
        this.report(
          `Division by zero in arithmetic expression: ${this.expression}`,
        )
        return null
      }

      value = operator === "*" ? value * right : value / right
    }

    return value
  }

  private parseUnary(): number | null {
    this.skipWhitespace()

    if (this.expression[this.index] === "-") {
      this.index++
      const value = this.parseUnary()
      return value === null ? null : -value
    }

    return this.parsePrimary()
  }

  private parsePrimary(): number | null {
    this.skipWhitespace()

    if (this.expression[this.index] === "(") {
      this.index++
      const value = this.parseExpression()
      this.skipWhitespace()

      if (this.expression[this.index] !== ")") {
        this.report(
          `Missing closing parenthesis in expression: ${this.expression}`,
        )
        return null
      }

      this.index++
      return value
    }

    const variableMatch = this.expression.slice(this.index).match(
      /^\$[A-Za-z0-9_]+/,
    )
    if (variableMatch) {
      const variableName = variableMatch[0]
      this.index += variableName.length
      const value = this.variables.get(variableName)

      if (typeof value !== "number") {
        this.report(`Numeric variable not found: ${variableName}`)
        return null
      }

      return value
    }

    const numberMatch = this.expression.slice(this.index).match(
      /^(?:\d+(?:\.\d*)?|\.\d+)/,
    )
    if (numberMatch) {
      this.index += numberMatch[0].length
      return Number(numberMatch[0])
    }

    return null
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.expression[this.index] ?? "")) this.index++
  }

  private report(message: string): void {
    this.errorReporter?.addError(message, "set_error", {
      expression: this.expression,
    })
  }
}

export function parseArithmeticExpression(
  expression: string,
  variables: NumericVariables,
  errorReporter?: ErrorReporter,
): number | null {
  return new ArithmeticParser(expression, variables, errorReporter).parse()
}
