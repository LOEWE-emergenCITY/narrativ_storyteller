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

export function handleConditionNode(
  node: ConditionNode,
  visitedBlocks: Set<string>,
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
    }
  }
}
