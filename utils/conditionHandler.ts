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

/**
 * Evaluate OR conditions: block1 or block2 or block3
 * Each block is evaluated via evaluateSingleBlock.
 */
function evaluateOrCondition(
  blockStr: string,
  variables: Map<string, string | number | boolean>,
  visitedBlocks: Set<string>,
  errorReporter?: ErrorReporter,
): boolean {
  const orBlocks = blockStr
    .replace(/[()]/g, "")
    .split(" or ")
    .map((part) => part.trim())

  return orBlocks.some((orBlock) =>
    evaluateSingleBlock(orBlock, variables, visitedBlocks, errorReporter)
  )
}

/**
 * Main comparison condition handler.
 *
 * Supports:
 *   - Simple comparisons:  $var == value
 *   - Boolean variables:   $var
 *   - visited():           visited("X") / visited("X") == false
 *   - AND chains:          cond1 and cond2 and cond3
 *   - OR conditions:       cond1 or cond2  (also inside AND chains)
 *   - Multiplication:      $var * $other (3/4) > 10
 *   - Negation:            not (condition)
 */
function handleComparisionCondition(
  condition: string,
  variables: Map<string, string | number | boolean>,
  visitedBlocks: Set<string>,
  errorReporter?: ErrorReporter,
): boolean {
  const trimmed = condition.trim()

  // Handle NOT operator
  if (trimmed.startsWith("not ")) {
    const innerCondition = trimmed.replace("not (", "").replace(")", "").trim()
    return !handleComparisionCondition(
      innerCondition,
      variables,
      visitedBlocks,
      errorReporter,
    )
  }

  // Split by AND — each block is evaluated independently and all must be true
  const conditionBlocks = trimmed.split(" and ").map((part) => part.trim())

  for (const block of conditionBlocks) {
    // OR condition within an AND block
    if (block.includes(" or ")) {
      if (
        !evaluateOrCondition(block, variables, visitedBlocks, errorReporter)
      ) {
        return false
      }
      continue
    }

    // All other shapes (visited, truthy, comparison, multiplication)
    if (!evaluateSingleBlock(block, variables, visitedBlocks, errorReporter)) {
      return false
    }
  }

  return true
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
