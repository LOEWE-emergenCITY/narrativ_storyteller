import { ConditionNode } from "@/utils/storyTypes.tsx"
import { ErrorReporter } from "@/utils/errorReporter.ts"
import {
  parseConditionValue,
  parseFraction,
  parseNumber,
} from "@/utils/valueParser.ts"

/**
 * Compare two values using the given operator
 */
function compareValues(
  operator: string,
  left: string | number | boolean,
  right: string | number | boolean,
): boolean {
  switch (operator) {
    case "==":
      return left === right
    case "!=":
      return left !== right
    case ">":
      return (left as number) > (right as number)
    case "<":
      return (left as number) < (right as number)
    case ">=":
      return (left as number) >= (right as number)
    case "<=":
      return (left as number) <= (right as number)
    default:
      console.error(`Invalid operator in condition: ${operator}`)
      return false
  }
}

/**
 * Evaluate a simple 3-element comparison: [variable, operator, value]
 */
function evaluateSimpleComparison(
  conditions: string[],
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): boolean {
  if (conditions.length !== 3) {
    errorReporter?.addError(
      `Invalid condition format: expected 3 parts, got ${conditions.length}`,
      "condition_error",
      { conditions },
    )
    return false
  }

  const [leftValueRaw, operator, rightValueRaw] = conditions

  if (!variables.has(leftValueRaw)) {
    errorReporter?.addError(
      `Variable not found: ${leftValueRaw}`,
      "validation_error",
      { variable: leftValueRaw },
    )
    return false
  }

  const leftValue = variables.get(leftValueRaw)!
  const rightValue = parseConditionValue(
    rightValueRaw,
    variables,
    errorReporter,
  )

  if (rightValue === null) {
    return false
  }

  return compareValues(operator, leftValue, rightValue)
}

/**
 * Evaluate multiplication conditions like $total_time*(3/4) > 10
 */
function evaluateMultiplicationCondition(
  conditionStr: string,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): boolean {
  const conditions = conditionStr.split(" ").map((part) => part.trim())

  if (conditions.length < 5) {
    errorReporter?.addError(
      `Invalid multiplication condition format`,
      "condition_error",
      { condition: conditionStr },
    )
    return false
  }

  const [leftValueRaw, operator, variableName, _, rightValueRaw] = conditions

  if (!variables.has(leftValueRaw) || !variables.has(variableName)) {
    errorReporter?.addError(
      `Variable not found in multiplication condition`,
      "validation_error",
      { left: leftValueRaw, variable: variableName },
    )
    return false
  }

  const leftValue = variables.get(leftValueRaw)! as number
  const multiplicator = variables.get(variableName)! as number

  let rightValue = 1

  if (rightValueRaw.includes("/")) {
    const fraction = parseFraction(rightValueRaw, errorReporter)
    if (fraction === null) return false
    rightValue = fraction
  } else {
    const parsed = parseNumber(rightValueRaw, errorReporter)
    if (parsed === null) return false
    rightValue = parsed
  }

  const computedValue = multiplicator * rightValue

  return compareValues(operator, leftValue, computedValue)
}

/**
 * Evaluate a visited() expression.
 *
 * Handles:
 *   visited("BlockName")            → true if visited
 *   visited("BlockName") == true    → true if visited
 *   visited("BlockName") == false   → true if NOT visited
 */
function handleVisitedCondition(
  condition: string,
  visitedBlocks: Set<string>,
  errorReporter?: ErrorReporter,
): boolean {
  // Extract block name (strips surrounding quotes) and optional == true/false
  const match = condition
    .trim()
    .match(/^visited\("([^"]+)"\)(?:\s*==\s*(true|false))?$/)

  if (!match) {
    // Fallback: try without quotes for legacy visited(BlockName) syntax
    const legacyMatch = condition
      .trim()
      .match(/^visited\(([^")]+)\)(?:\s*==\s*(true|false))?$/)

    if (!legacyMatch) {
      errorReporter?.addError(
        `Invalid visited condition format: ${condition}`,
        "condition_error",
        { condition },
      )
      return false
    }

    const blockTitle = legacyMatch[1].trim()
    const comparison = legacyMatch[2]
    const isVisited = visitedBlocks.has(blockTitle)
    return comparison === "false" ? !isVisited : isVisited
  }

  const blockTitle = match[1]
  const comparison = match[2] // "true", "false", or undefined
  const isVisited = visitedBlocks.has(blockTitle)

  return comparison === "false" ? !isVisited : isVisited
}

/**
 * Evaluate a single condition block — handles all atomic condition shapes:
 *   - visited("X") / visited("X") == false
 *   - $var                          (truthy check)
 *   - $var == value                 (3-part comparison)
 *   - $var * $other (3/4) > 10     (multiplication)
 */
function evaluateSingleBlock(
  block: string,
  variables: Map<string, string | number | boolean>,
  visitedBlocks: Set<string>,
  errorReporter?: ErrorReporter,
): boolean {
  const trimmed = block.trim()

  // visited() check
  if (trimmed.startsWith("visited(")) {
    return handleVisitedCondition(trimmed, visitedBlocks, errorReporter)
  }

  const parts = trimmed.split(" ").map((p) => p.trim()).filter((p) => p)

  // Single variable truthy check
  if (parts.length === 1) {
    if (!variables.has(parts[0])) {
      errorReporter?.addError(
        `Variable not found: ${parts[0]}`,
        "validation_error",
        { variable: parts[0] },
      )
      return false
    }
    return Boolean(variables.get(parts[0]))
  }

  // 3-part comparison: $var == value
  if (parts.length === 3) {
    return evaluateSimpleComparison(parts, variables, errorReporter)
  }

  // Multiplication condition: $var * $other (3/4) > 10
  if (trimmed.includes("*")) {
    return evaluateMultiplicationCondition(trimmed, variables, errorReporter)
  }

  errorReporter?.addError(
    `Unrecognized single block condition format`,
    "condition_error",
    { block: trimmed },
  )
  return false
}

function isConditionBalanced(condition: string): boolean {
  let depth = 0
  let inQuotes = false

  for (let index = 0; index < condition.length; index++) {
    const character = condition[index]

    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (inQuotes) continue

    if (character === "(") depth++
    if (character === ")" && --depth < 0) return false
  }

  return !inQuotes && depth === 0
}

function stripOuterParentheses(condition: string): string {
  let result = condition.trim()

  while (result.startsWith("(")) {
    let depth = 0
    let inQuotes = false
    let wrapsWholeCondition = false

    for (let index = 0; index < result.length; index++) {
      const character = result[index]
      if (character === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (inQuotes) continue

      if (character === "(") depth++
      if (character === ")") {
        depth--
        if (depth === 0) {
          wrapsWholeCondition = index === result.length - 1
          break
        }
      }
    }

    if (!wrapsWholeCondition) break
    result = result.slice(1, -1).trim()
  }

  return result
}

function splitTopLevelCondition(
  condition: string,
  operator: "and" | "or",
): string[] {
  const parts: string[] = []
  let depth = 0
  let inQuotes = false
  let partStart = 0

  for (let index = 0; index < condition.length; index++) {
    const character = condition[index]

    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (inQuotes) continue

    if (character === "(") {
      depth++
      continue
    }
    if (character === ")") {
      depth--
      continue
    }

    const operatorEnd = index + operator.length
    if (
      depth === 0 && condition.slice(index, operatorEnd) === operator &&
      /\s/.test(condition[index - 1] ?? "") &&
      /\s/.test(condition[operatorEnd] ?? "")
    ) {
      parts.push(condition.slice(partStart, index).trim())
      partStart = operatorEnd
      index = operatorEnd - 1
    }
  }

  if (parts.length === 0) return [condition.trim()]
  parts.push(condition.slice(partStart).trim())
  return parts
}

/**
 * Main comparison condition handler.
 *
 * Supports:
 *   - Simple comparisons:  $var == value
 *   - Boolean variables:   $var
 *   - visited():           visited("X") / visited("X") == false
 *   - AND chains:          cond1 and cond2 and cond3
 *   - OR conditions:       cond1 or cond2
 *   - Grouping:            (cond1 or cond2) and cond3
 *   - Multiplication:      $var * $other (3/4) > 10
 *   - Negation:            not (condition)
 */
function handleComparisionCondition(
  condition: string,
  variables: Map<string, string | number | boolean>,
  visitedBlocks: Set<string>,
  errorReporter?: ErrorReporter,
): boolean {
  const trimmed = stripOuterParentheses(condition)

  if (trimmed.startsWith("not ")) {
    return !handleComparisionCondition(
      trimmed.slice(4),
      variables,
      visitedBlocks,
      errorReporter,
    )
  }

  const orParts = splitTopLevelCondition(trimmed, "or")
  if (orParts.length > 1) {
    return orParts.some((part) =>
      handleComparisionCondition(part, variables, visitedBlocks, errorReporter)
    )
  }

  const andParts = splitTopLevelCondition(trimmed, "and")
  if (andParts.length > 1) {
    return andParts.every((part) =>
      handleComparisionCondition(part, variables, visitedBlocks, errorReporter)
    )
  }

  return evaluateSingleBlock(trimmed, variables, visitedBlocks, errorReporter)
}

/**
 * Main public API for handling condition nodes
 */
export function handleConditionNode(
  node: ConditionNode,
  visitedBlocks: Set<string>,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): boolean {
  const reporter = errorReporter ?? new ErrorReporter()

  // Once/endonce blocks are not yet implemented
  if (node.type === "once" || node.type === "endonce") {
    return false
  }

  // Handle if/elseif conditions
  if (node.type === "if" || node.type === "elseif") {
    if (!node.condition) {
      return true // No condition means always true
    }

    if (!isConditionBalanced(node.condition)) {
      reporter.addError(
        `Unbalanced parentheses or quotes in condition: ${node.condition}`,
        "condition_error",
        { condition: node.condition },
      )
      return false
    }

    return handleComparisionCondition(
      node.condition,
      variables,
      visitedBlocks,
      reporter,
    )
  }

  // Else blocks are always true when reached — the stack decides, not evaluation
  if (node.type === "else") {
    return true
  }

  // Endif is a no-op marker
  if (node.type === "endif") {
    return false
  }

  return false
}
