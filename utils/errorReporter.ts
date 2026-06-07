export interface ErrorEntry {
  message: string
  type: "parse_error" | "validation_error" | "condition_error" | "set_error"
  context?: Record<string, unknown>
  timestamp: number
}

export class ErrorReporter {
  private errors: ErrorEntry[] = []

  addError(
    message: string,
    type: ErrorEntry["type"],
    context?: Record<string, unknown>,
  ): void {
    this.errors.push({
      message,
      type,
      context,
      timestamp: Date.now(),
    })
  }

  getErrors(): ErrorEntry[] {
    return [...this.errors]
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  clear(): void {
    this.errors = []
  }

  getErrorCount(): number {
    return this.errors.length
  }

  getErrorsByType(type: ErrorEntry["type"]): ErrorEntry[] {
    return this.errors.filter((error) => error.type === type)
  }
}
