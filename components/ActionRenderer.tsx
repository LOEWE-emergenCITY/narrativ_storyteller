import type { ComponentChildren } from "preact"
import { ActionNode, Block } from "@/utils/storyTypes.tsx"
import { Button } from "@/components/Button.tsx"

interface ActionRendererProps {
  actions: ActionNode[]
  currentBlock: Block
  onActionSelect: (target: string | number) => void
}

export function ActionRenderer({
  actions,
  currentBlock: _currentBlock,
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
      elements.push(
        <Button
          key={`choice-${action.myChoiceLevel}`}
          choiceId={String(action.myChoiceLevel ?? "")}
          onClick={() => onActionSelect(action.myChoiceLevel ?? 0)}
        >
          {action.text}
        </Button>,
      )
    }
  }

  return <>{elements}</>
}
