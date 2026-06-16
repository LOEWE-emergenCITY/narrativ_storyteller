// ===== CHOICE HANDLER =====

import { selectChoice } from "@/utils/storyStore.ts"
import { ActionNode, ContentNode } from "@/utils/storyTypes.tsx"

/**
 * Handle a choice click as a single batched store action.
 * Checks if the next node is a jump to resolve the navigation target.
 */
export function handleChoiceClick(
  contentNodes: ContentNode[],
  currentIndex: number,
): void {
  const node = contentNodes[currentIndex]

  if (node.type !== "choice") {
    console.error(
      `Expected choice node at index ${currentIndex}, got ${node.type}`,
    )
    return
  }

  const choiceNode = node as ActionNode

  if (choiceNode.myChoiceLevel === undefined) {
    console.error(`Choice node at index ${currentIndex} missing myChoiceLevel`)
    return
  }

  const nextNode = contentNodes[currentIndex + 1]
  const jumpTarget = nextNode?.type === "jump"
    ? (nextNode as ActionNode).jumpTarget
    : undefined

  selectChoice(choiceNode.myChoiceLevel, jumpTarget)
}
