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
  const rightValue = parseConditionValue(rightValueRaw, variables, errorReporter)

  if (rightValue === null) {
    return false
  }

  return compareValues(operator, leftValue, rightValue)
}

/**
 * Evaluate OR conditions like (var1 == "x" or var2 > 5)
 */
function evaluateOrCondition(
  blockStr: string,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): boolean {
  const orBlocks = blockStr
    .replace(/[()]/g, "")
    .split(" or ")
    .map((part) => part.trim())

  return orBlocks.some((orBlock) => {
    const orConditions = orBlock.split(" ").map((part) => part.trim())
    return evaluateSimpleComparison(orConditions, variables, errorReporter)
  })
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

  // Parse fraction if present
  if (rightValueRaw.includes("/")) {
    const fraction = parseFraction(rightValueRaw, errorReporter)
    if (fraction === null) return false
    rightValue = fraction
  } else {
    const parsed = parseNumber(rightValueRaw, errorReporter)
    if (parsed === null) return false
    rightValue = parsed
  }

  // Apply multiplication
  const computedValue = multiplicator * rightValue

  return compareValues(operator, leftValue, computedValue)
}

/**
 * Evaluate a visited condition like visited(StartBlock) or visited(StartBlock, not)
 */
function handleVisitedCondition(
  condition: string,
  visitedBlocks: Set<string>,
  errorReporter?: ErrorReporter,
): boolean {
  const visitedCondition = condition
    .replace("visited(", "")
    .replace(")", "")
    .trim()
    .split(" ")

  if (visitedCondition.length > 2) {
    errorReporter?.addError(
      `Invalid visited condition format`,
      "condition_error",
      { condition },
    )
    return false
  }

  const blockTitle = visitedCondition[0]
  const hasNotModifier = visitedCondition.length === 2 &&
    visitedCondition[1] === "not"

  const isVisited = visitedBlocks.has(blockTitle)

  return hasNotModifier ? !isVisited : isVisited
}

/**
 * Main comparison condition handler supporting:
 * - Simple comparisons: var == value
 * - Boolean variables: var (truthy check)
 * - OR conditions: (var1 == x or var2 > y)
 * - Multiplication: var1 * var2 (3/4) > 10
 * - Negation: not (condition)
 */
function handleComparisionCondition(
  condition: string,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): boolean {
  const trimmed = condition.trim()

  // Handle NOT operator
  if (trimmed.startsWith("not ")) {
    const innerCondition = trimmed.replace("not (", "").replace(")", "").trim()
    return !handleComparisionCondition(
      innerCondition,
      variables,
      errorReporter,
    )
  }

  // Split by AND to handle multiple conditions
  const conditionBlocks = trimmed.split(" and ").map((part) => part.trim())

  if (conditionBlocks.length === 0) {
    errorReporter?.addError(
      `Invalid condition: empty or malformed`,
      "condition_error",
      { condition: trimmed },
    )
    return false
  }

  const results: boolean[] = []

  for (const block of conditionBlocks) {
    const conditions = block.split(" ").map((part) => part.trim())

    // Single variable truthy check
    if (conditions.length === 1) {
      const variableName = conditions[0]
      if (!variables.has(variableName)) {
        errorReporter?.addError(
          `Variable not found: ${variableName}`,
          "validation_error",
          { variable: variableName },
        )
        return false
      }
      results.push(Boolean(variables.get(variableName)))
      continue
    }

    // OR condition
    if (conditions.length > 3 && block.includes(" or ")) {
      results.push(evaluateOrCondition(block, variables, errorReporter))
      continue
    }

    // Multiplication condition
    if (conditions.length > 3 && block.includes("*")) {
      results.push(
        evaluateMultiplicationCondition(block, variables, errorReporter),
      )
      continue
    }

    // Simple comparison (3 elements)
    if (conditions.length === 3) {
      results.push(evaluateSimpleComparison(conditions, variables, errorReporter))
      continue
    }

    // Unrecognized format
    errorReporter?.addError(
      `Unrecognized condition format`,
      "condition_error",
      { block },
    )
    return false
  }

  // All conditions must be true (AND logic)
  return results.every((res) => res)
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

    if (node.condition.startsWith("visited(")) {
      return handleVisitedCondition(node.condition, visitedBlocks, reporter)
    }

    return handleComparisionCondition(
      node.condition,
      variables,
      reporter,
    )
  }

  // Else blocks are always true when reached
  if (node.type === "else") {
    return true
  }

  // Endif is a no-op marker
  if (node.type === "endif") {
    return false
  }

  return false
}
