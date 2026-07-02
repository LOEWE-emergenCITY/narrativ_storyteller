// ===== CHOICE HANDLER =====

import {
  evaluateActiveBlockProgress,
  filterVisibleNodes,
} from "@/utils/nodeVisibility.ts"
import { buildNodeVariables } from "@/utils/setHandler.ts"
import {
  applyVariables,
  blockEntryVariables,
  currentBlockTitle,
  navigateToBlock,
  seenOnceSections,
  selectChoice,
  storyBlocks,
  storyVariables,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { ActionNode, ContentNode } from "@/utils/storyTypes.tsx"

/**
 * Handle a choice click as a single batched store action.
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

  const nextChoices = [
    ...contentNodes[currentIndex].choicePath,
    choiceNode.myChoiceLevel,
  ]
  const activeBlock = storyBlocks.value.get(currentBlockTitle.value)
  const resolvedContentNodes = activeBlock?.contentNodes ?? contentNodes
  const context = {
    visitedBlocks: visitedBlocks.value,
    seenOnceSections: seenOnceSections.value,
    variables: storyVariables.value,
  }
  const visibleResult = filterVisibleNodes(
    resolvedContentNodes,
    nextChoices,
    context,
  )
  const progress = evaluateActiveBlockProgress(
    resolvedContentNodes,
    visibleResult.visibleNodes,
    nextChoices,
  )

  if (progress.status === "auto_jump_now" && progress.continueTarget) {
    const { finalVariables } = buildNodeVariables(
      visibleResult.visibleNodes,
      blockEntryVariables.value,
    )
    applyVariables(finalVariables)
    selectChoice(choiceNode.myChoiceLevel)
    navigateToBlock(progress.continueTarget)
    return
  }

  selectChoice(choiceNode.myChoiceLevel)
}
