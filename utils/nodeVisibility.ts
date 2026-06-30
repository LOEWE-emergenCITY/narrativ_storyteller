import { handleConditionNode } from "@/utils/conditionHandler.ts"
import { ActionNode, ConditionNode, ContentNode } from "@/utils/storyTypes.tsx"

export interface RenderContext {
  visitedBlocks: Set<string>
  seenOnceSections: Set<string>
  variables: Map<string, string | number | boolean>
}

export interface VisibleNodesResult {
  visibleNodes: ContentNode[]
  visibleOnceKeys: Set<string>
}

function getNextBranchIndex(
  nodes: ContentNode[],
  fromIndex: number,
  targetLevel: number,
): number {
  for (let i = fromIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]
    if (
      (node.type === "elseif" || node.type === "else" ||
        node.type === "endif") &&
      node.identionLevel === targetLevel
    ) {
      return i
    }
  }

  return nodes.length
}

export function filterVisibleNodes(
  contentNodes: ContentNode[],
  choices: number[],
  context: RenderContext,
): VisibleNodesResult {
  const visible: ContentNode[] = []
  const visibleOnceKeys = new Set<string>()
  const conditionStack: Array<{ active: boolean; done: boolean }> = []
  const onceStack: Array<{ active: boolean }> = []

  const allConditionsActive = (): boolean =>
    conditionStack.every((condition) => condition.active)
  const allOnceActive = (): boolean =>
    onceStack.every((once) => once.active)

  let i = 0
  while (i < contentNodes.length) {
    const node = contentNodes[i]

    if (node.type === "if") {
      const conditionNode = node as ConditionNode
      const result = allConditionsActive() &&
        handleConditionNode(
          conditionNode,
          context.visitedBlocks,
          context.variables,
        )
      conditionStack.push({ active: result, done: result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

      i++
      continue
    }

    if (node.type === "elseif") {
      const conditionNode = node as ConditionNode
      const top = conditionStack.pop()!
      const result = allConditionsActive() && !top.done &&
        handleConditionNode(
          conditionNode,
          context.visitedBlocks,
          context.variables,
        )

      conditionStack.push({ active: result, done: top.done || result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

      i++
      continue
    }

    if (node.type === "else") {
      const top = conditionStack.pop()!
      const active = allConditionsActive() && !top.done
      conditionStack.push({ active, done: true })
      i++
      continue
    }

    if (node.type === "endif") {
      conditionStack.pop()
      i++
      continue
    }

    if (node.type === "once") {
      const isActive = allConditionsActive() && allOnceActive() &&
        (!node.onceKey || !context.seenOnceSections.has(node.onceKey))

      if (isActive && node.onceKey) {
        visibleOnceKeys.add(node.onceKey)
      }

      onceStack.push({ active: isActive })
      i++
      continue
    }

    if (node.type === "endonce") {
      onceStack.pop()
      i++
      continue
    }

    if (allConditionsActive() && allOnceActive()) {
      if (node.onceKey && context.seenOnceSections.has(node.onceKey)) {
        i++
        continue
      }

      if (node.choicePath.every((value) => choices.includes(value))) {
        if (
          node.type === "choice" &&
          choices.length > node.choicePath.length &&
          choices[node.choicePath.length] !== (node as ActionNode).myChoiceLevel!
        ) {
          i++
          continue
        }

        if (node.onceKey) {
          visibleOnceKeys.add(node.onceKey)
        }

        visible.push(node)
      }
    }

    i++
  }

  return { visibleNodes: visible, visibleOnceKeys }
}
