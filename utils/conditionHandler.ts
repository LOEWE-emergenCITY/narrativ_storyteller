import { ConditionNode } from "@/utils/storyTypes.tsx"

function handleVisitedCondition(condition: string, visitedBlocks: Set<string>) {
  const visitedCondition = condition.replace("visited(", "").replace(")", "")
    .trim().split(" ")

  if (visitedCondition.length > 3) {
    console.error(`Invalid visited condition: ${condition}`)
    return false
  }

  const blockTitle = visitedCondition[0]

  if (visitedCondition.length === 1) {
    return visitedBlocks.has(blockTitle)
  }

  if (visitedCondition.length === 3) {
    return !visitedBlocks.has(blockTitle)
  }
}

// need to add tests for all conditions
// need to refactor this to be more readable and maintainable
function handleComparisionCondition(
  condition: string,
  variables: Map<string, string | number | boolean>,
): boolean {
  // handle not operator by checking if condition starts with "not " and then evaluating the rest of the condition and negating the result
  if (condition.startsWith("not ")) {
    const innerCondition = condition.replace("not (", "").replace(")", "")
      .trim()
    return !handleComparisionCondition(innerCondition, variables)
  }

  // split condition by "and" to handle multiple conditions, then evaluate each condition separately and combine the results with AND logic
  const conditionBlocks = condition.split(" and ").map((part) => part.trim())
  if (conditionBlocks.length === 0) {
    console.error(`Invalid condition: ${condition}`)
    return false
  }

  const result = []

  for (let i = 0; i < conditionBlocks.length; i++) {
    console.log(conditionBlocks[i])
    const conditions = conditionBlocks[i].split(
      " ",
    ).map((part) => part.trim())

    if (conditions.length === 1) {
      // if condition is just a variable, check if it's truthy
      const variableName = conditions[0]
      if (!variables.has(variableName)) {
        console.error(`Variable not found: ${variableName}`)
        return false
      }
      result.push(Boolean(variables.get(variableName)))
      continue
    }

    if (conditions.length > 3) {
      if (conditions.includes("or")) {
        // handle or conditions by splitting them and evaluating them separately, then ORing the results
        const orBlocks = conditionBlocks[i].replace("(", "").replace(")", "")
          .split(" or ").map((part) => part.trim())

        const orResult = orBlocks.some((orBlock) => {
          const orConditions = orBlock.split(" ").map((part) => part.trim())
          if (orConditions.length !== 3) {
            console.error(`Invalid condition: ${orBlock}`)
            return false
          }
          const [leftValueRaw, operator, rightValueRaw] = orConditions

          if (!variables.has(leftValueRaw)) {
            console.error(`Variable not found: ${leftValueRaw}`)
            return false
          }

          const currentValue = variables.get(leftValueRaw)!
          let rightValue: string | number | boolean

          if (rightValueRaw === "true" || rightValueRaw === "false") {
            rightValue = rightValueRaw === "true"
          } else if (
            rightValueRaw.startsWith('"') && rightValueRaw.endsWith('"')
          ) {
            rightValue = rightValueRaw.slice(1, -1)
          } else if (Number(rightValueRaw) || rightValueRaw === "0") {
            if (Number(rightValueRaw) < 0) {
              console.warn(
                `Negative numbers in conditions might not work as expected: ${rightValueRaw}`,
              )
            }
            rightValue = Number(rightValueRaw)
          } else if (variables.has(rightValueRaw)) {
            rightValue = variables.get(rightValueRaw)!
          } else {
            console.error(`Invalid condition value: ${rightValueRaw}`)
            return false
          }

          switch (operator) {
            case "==":
              return currentValue === rightValue
            case "!=":
              return currentValue !== rightValue
            case ">":
              return (currentValue as number) > (rightValue as number)
            case "<":
              return (currentValue as number) < (rightValue as number)
            case ">=":
              return (currentValue as number) >= (rightValue as number)
            case "<=":
              return (currentValue as number) <= (rightValue as number)
            default:
              console.error(`Invalid operator in condition: ${operator}`)
              return false
          }
        })
        result.push(orResult)
        continue
      }

      if (conditions.includes("*")) {
        // handle this $total_time*(3/4) by splitting by * and evaluating the left and right side, then multiplying them
        const [leftValueRaw, operator, variableName, _, rightValueRaw] =
          conditions
        if (!variables.has(leftValueRaw) || !variables.has(variableName)) {
          console.error(
            `Variable not found: ${leftValueRaw} or ${variableName}`,
          )
          return false
        }
        const currentValue = variables.get(leftValueRaw)!
        const multiplicator = variables.get(variableName)!
        let rightValue = 1

        if (rightValueRaw.includes("/")) {
          const [numeratorRaw, denominatorRaw] = rightValueRaw.replace("(", "")
            .replace(")", "").split("/").map((part) => part.trim())
          let numerator = 1
          let denominator = 1

          if (Number(numeratorRaw) || numeratorRaw === "0") {
            if (Number(numeratorRaw) < 0) {
              console.warn(
                `Negative numbers in conditions might not work as expected: ${numeratorRaw}`,
              )
            }
            numerator = Number(numeratorRaw)
          }
          if (Number(denominatorRaw) || denominatorRaw === "0") {
            if (Number(denominatorRaw) === 0) {
              console.error(
                `Not allowed to have zero denominator: ${denominatorRaw}`,
              )
            }
            denominator = Number(denominatorRaw)
          }
          rightValue = numerator / denominator
        }
        rightValue = Number(rightValueRaw)

        rightValue = (multiplicator as number) * rightValue

        switch (operator) {
          case "==":
            result.push(currentValue === rightValue)
            break
          case "!=":
            result.push(currentValue !== rightValue)
            break
          case ">":
            result.push((currentValue as number) > (rightValue as number))
            break
          case "<":
            result.push((currentValue as number) < (rightValue as number))
            break
          case ">=":
            result.push((currentValue as number) >= (rightValue as number))
            break
          case "<=":
            result.push((currentValue as number) <= (rightValue as number))
            break
          default:
            console.error(`Invalid operator in condition: ${operator}`)
            return false
        }
      }
    }

    if (conditions.length === 3) {
      const [leftValueRaw, operator, rightValueRaw] = conditions

      // if no variable found, then this is a issue and we should return false
      if (!variables.has(leftValueRaw)) {
        console.error(`Variable not found: ${leftValueRaw}`)
        return false
      }

      const currentValue = variables.get(leftValueRaw)!
      let rightValue: string | number | boolean

      if (rightValueRaw === "true" || rightValueRaw === "false") {
        rightValue = rightValueRaw === "true"
      } else if (rightValueRaw.startsWith('"') && rightValueRaw.endsWith('"')) {
        rightValue = rightValueRaw.slice(1, -1)
      } else if (Number(rightValueRaw) || rightValueRaw === "0") {
        if (Number(rightValueRaw) < 0) {
          console.warn(
            `Negative numbers in conditions might not work as expected: ${rightValueRaw}`,
          )
        }
        rightValue = Number(rightValueRaw)
      } else if (variables.has(rightValueRaw)) {
        rightValue = variables.get(rightValueRaw)!
      } else {
        console.error(`Invalid condition value: ${rightValueRaw}`)
        return false
      }

      switch (operator) {
        case "==":
          result.push(currentValue === rightValue)
          break
        case "!=":
          result.push(currentValue !== rightValue)
          break
        case ">":
          result.push((currentValue as number) > (rightValue as number))
          break
        case "<":
          result.push((currentValue as number) < (rightValue as number))
          break
        case ">=":
          result.push((currentValue as number) >= (rightValue as number))
          break
        case "<=":
          result.push((currentValue as number) <= (rightValue as number))
          break
        default:
          console.error(`Invalid operator in condition: ${operator}`)
          return false
      }
    }
  }

  return result.every((res) => res)
}

export function handleConditionNode(
  node: ConditionNode,
  visitedBlocks: Set<string>,
  variables: Map<string, string | number | boolean>,
) {
  if (node.type === "once" || node.type === "endonce") {
    console.log("Handling once/endonce node", node)
    return
  }

  if (node.type === "if" || node.type === "elseif") {
    if (node.condition?.startsWith("visited(")) {
      const visitedResult = handleVisitedCondition(
        node.condition,
        visitedBlocks,
      )
      console.log(
        `Handling condition node ${node.type} with condition ${node.condition}, block visited: ${visitedResult}`,
      )
    } else {
      console.log(handleComparisionCondition(node.condition!, variables))
    }
  }
}
