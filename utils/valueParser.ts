import { ErrorReporter } from "@/utils/errorReporter.ts"

type ParsedValue = string | number | boolean | null

/**
 * Parse a raw value string into a typed value
 * Handles booleans, quoted strings, numbers, and variable lookups
 * @returns parsed value or null if invalid
 */
export function parseConditionValue(
  rawValue: string,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): ParsedValue {
  const trimmed = rawValue.trim()

  // Boolean values
  if (trimmed === "true") return true
  if (trimmed === "false") return false

  // Quoted strings
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }

  // Numeric values
  if (trimmed === "0" || Number(trimmed)) {
    return Number(trimmed)
  }

  // Variable lookup
  if (variables.has(trimmed)) {
    return variables.get(trimmed)!
  }

  // Invalid value
  errorReporter?.addError(
    `Invalid condition value: ${rawValue}`,
    "parse_error",
    { value: rawValue },
  )
  return null
}

/**
 * Parse a set command value (similar to condition values)
 */
export function parseSetValue(
  rawValue: string,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): ParsedValue {
  const trimmed = rawValue.trim()

  // Boolean values
  if (trimmed === "true") return true
  if (trimmed === "false") return false

  // Quoted strings
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }

  // Numeric values
  if (trimmed === "0" || Number(trimmed)) {
    return Number(trimmed)
  }

  // Variable lookup
  if (variables.has(trimmed)) {
    return variables.get(trimmed)!
  }

  // Invalid value
  errorReporter?.addError(
    `Invalid set value: ${rawValue}`,
    "set_error",
    { value: rawValue },
  )
  return null
}

/**
 * Parse a number from raw string with validation
 */
export function parseNumber(
  rawValue: string,
  errorReporter?: ErrorReporter,
): number | null {
  const num = Number(rawValue)

  if (isNaN(num)) {
    errorReporter?.addError(
      `Cannot parse number: ${rawValue}`,
      "parse_error",
      { value: rawValue },
    )
    return null
  }

  return num
}

/**
 * Parse fraction notation like "3/4"
 */
export function parseFraction(
  fractionStr: string,
  errorReporter?: ErrorReporter,
): number | null {
  const cleaned = fractionStr.replace(/[()]/g, "").trim()
  const [numeratorRaw, denominatorRaw] = cleaned.split("/").map((p) => p.trim())

  if (!numeratorRaw || !denominatorRaw) {
    errorReporter?.addError(
      `Invalid fraction format: ${fractionStr}`,
      "parse_error",
      { value: fractionStr },
    )
    return null
  }

  const numerator = parseNumber(numeratorRaw, errorReporter) ?? 1
  const denominator = parseNumber(denominatorRaw, errorReporter) ?? 1

  if (denominator === 0) {
    errorReporter?.addError(
      `Division by zero in fraction: ${fractionStr}`,
      "parse_error",
      { value: fractionStr },
    )
    return null
  }

  return numerator / denominator
}
