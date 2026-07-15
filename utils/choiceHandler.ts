// ===== CHOICE HANDLER =====

import {
  evaluateActiveBlockProgress,
  evaluateVisibleNodesSequentially,
} from "@/utils/nodeVisibility.ts"
import {
  applyVariables,
  blockEntryVariables,
  choices,
  currentBlockTitle,
  navigateToBlock,
  navigateToDetour,
  randomChoices,
  resolveRandomChoices,
  resumeFromLine,
  seenOnceSections,
  selectChoice,
  storyBlocks,
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

  if (choiceNode.choiceBlockId === undefined) {
    console.error(`Choice node at index ${currentIndex} missing choiceBlockId`)
    return
  }

  const nextChoices = {
    ...choices.value,
    [choiceNode.choiceBlockId]: choiceNode.myChoiceLevel,
  }
  const activeBlock = storyBlocks.value.get(currentBlockTitle.value)
  // Apply the same resume-from-line slice that StoryViewer uses so evaluation
  // is consistent with what is actually visible on screen.
  const fullNodes = activeBlock?.contentNodes ?? contentNodes
  const resolvedContentNodes = resumeFromLine.value > 0
    ? fullNodes.slice(resumeFromLine.value)
    : fullNodes
  const context = {
    visitedBlocks: visitedBlocks.value,
    seenOnceSections: seenOnceSections.value,
    variables: blockEntryVariables.value,
  }
  const visibleResult = evaluateVisibleNodesSequentially(
    resolvedContentNodes,
    nextChoices,
    randomChoices.value,
    context,
  )
  const progress = evaluateActiveBlockProgress(
    resolvedContentNodes,
    visibleResult.visibleNodes,
    nextChoices,
  )

  if (progress.status === "auto_jump_now" && progress.continueTarget) {
    applyVariables(visibleResult.finalVariables)
    resolveRandomChoices(visibleResult.resolvedRandomChoices)
    selectChoice(choiceNode.choiceBlockId, choiceNode.myChoiceLevel)
    navigateToBlock(progress.continueTarget)
    return
  }

  if (progress.status === "auto_detour_now" && progress.continueTarget) {
    applyVariables(visibleResult.finalVariables)
    resolveRandomChoices(visibleResult.resolvedRandomChoices)
    selectChoice(choiceNode.choiceBlockId, choiceNode.myChoiceLevel)
    // choices and currentIndentionLevel are updated synchronously by selectChoice.
    navigateToDetour(progress.continueTarget, {
      title: currentBlockTitle.value,
      line: progress.detourReturnLine ?? 0,
      choices: { ...choices.value },
      randomChoices: { ...randomChoices.value },
    })
    return
  }

  selectChoice(choiceNode.choiceBlockId, choiceNode.myChoiceLevel)
}
