import type { ComponentChildren } from "preact"
import { ActionNode, Block } from "@/utils/storyParser.ts"
import { Button } from "@/components/Button.tsx"

interface ActionRendererProps {
  actions: ActionNode[]
  currentBlock: Block
  onActionSelect: (target: string | number) => void
}

/**
 * Peek at the next line to check if it's a jump ActionNode
 * Used for choice + jump detection logic
 */
function peekNextLine(
  actionNode: ActionNode,
  block: Block,
): ActionNode | null {
  if (actionNode.type !== "choice" || actionNode.nextLine === undefined) {
    return null
  }

  const nextContent = block.contentLines.get(actionNode.nextLine)
  if (
    nextContent &&
    nextContent.type === "jump"
  ) {
    return nextContent as ActionNode
  }

  return null
}

/**
 * Get all sibling choice nodes starting from the given action
 * Returns array of [ActionNode, nextLineJump, choiceId]
 */
function collectChoiceSequence(
  startAction: ActionNode,
  block: Block,
): Array<
  { action: ActionNode; jumpAfter: ActionNode | null; choiceId: number }
> {
  const collected: Array<
    { action: ActionNode; jumpAfter: ActionNode | null; choiceId: number }
  > = []
  let currentAction = startAction
  let choiceId = 1

  while (currentAction && currentAction.type === "choice") {
    const jumpAfter = peekNextLine(currentAction, block)
    collected.push({ action: currentAction, jumpAfter, choiceId })

    // Check if there's a sibling
    if (
      currentAction.siblingLine === undefined ||
      currentAction.siblingLine === -1
    ) {
      break // No more siblings
    }

    const siblingContent = block.contentLines.get(currentAction.siblingLine)
    if (
      !siblingContent ||
      siblingContent.type !== "choice"
    ) {
      break // Not a choice, stop
    }

    currentAction = siblingContent as ActionNode
    choiceId++
  }

  return collected
}

export function ActionRenderer({
  actions,
  currentBlock,
  onActionSelect,
}: ActionRendererProps) {
  const elements: ComponentChildren[] = []

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]

    if (action.type === "jump") {
      elements.push(
        <Button
          key={`action-${i}`}
          onClick={() => {
            onActionSelect(action.jumpTarget ?? "")
          }}
        >
          Continue
        </Button>,
      )
    } else if (action.type === "detour") {
      elements.push(
        <Button
          key={`action-${i}`}
          onClick={() => {
            onActionSelect(action.jumpTarget ?? "")
          }}
        >
          Continue
        </Button>,
      )
    } else if (action.type === "choice") {
      // Collect all choice siblings starting from this one
      const choiceSequence = collectChoiceSequence(action, currentBlock)

      for (
        const { action: choiceAction, jumpAfter, choiceId } of choiceSequence
      ) {
        const handleChoiceClick = () => {
          if (jumpAfter) {
            // If next line is a jump, use that as the target
            onActionSelect(jumpAfter.jumpTarget ?? "")
          } else {
            // Otherwise, continue from the nextLine
            onActionSelect(choiceAction.nextLine ?? 0)
          }
        }

        elements.push(
          <Button
            key={`choice-${choiceId}`}
            choiceId={String(choiceId)}
            onClick={handleChoiceClick}
          >
            {choiceAction.text}
          </Button>,
        )
      }
    }
  }

  return <>{elements}</>
}
