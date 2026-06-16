import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import {
  getDebugNodeClass,
  getNodeType,
  isDebugNode,
  isNodeVisible,
  RenderConfig,
} from "@/utils/nodeRenderers.ts"
import { navigateToBlock } from "@/utils/storyStore.ts"
import {
  ActionNode,
  CommandNode,
  ContentNode,
  TextNode,
} from "@/utils/storyTypes.tsx"

import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { ChoiceTranscript } from "@/components/ChoiceTranscript.tsx"
import { MoodImage } from "@/components/MoodImage.tsx"
import { Chat } from "@/components/Chat.tsx"
import { clsx } from "clsx"
import { JSX } from "preact/jsx-runtime"

export function renderNode(
  node: ContentNode,
  index: number,
  contentNodes: ContentNode[],
  config: RenderConfig,
  visibleNodes: ContentNode[],
): JSX.Element[] {
  const result: JSX.Element[] = []

  if (!isNodeVisible(node, visibleNodes)) return result

  switch (getNodeType(node)) {
    case "text":
      result.push(
        <Text
          html={(node as TextNode).text}
          variables={config.nodeVariables?.get(node) ?? config.context.variables}
        />,
      )
      break

    case "chat": {
      const chatNode = node as TextNode
      result.push(
        <Chat
          isAngela={chatNode.speaker === "Angela"}
          sender={String(chatNode.speaker)}
        >
          {chatNode.text}
        </Chat>,
      )
      break
    }

    case "mood":
      result.push(<MoodImage name={(node as CommandNode).command} />)
      break

    case "set":
      // Handled in useEffect after render — intentionally skipped here.
      break

    case "detour":
      result.push(<>DETOUR</>)
      break

    case "choice": {
      const choiceNode = node as ActionNode

      // Historical block: render the chosen option as a styled read-only
      // transcript instead of an interactive button.
      if (config.isHistorical) {
        result.push(
          <ChoiceTranscript
            html={choiceNode.text || ""}
            variables={config.nodeVariables?.get(node) ?? config.context.variables}
          />,
        )
        break
      }

      result.push(
        <Button
          choiceId={String(choiceNode.myChoiceLevel)}
          onClick={() => handleChoiceClick(contentNodes, index)}
          html={choiceNode.text || ""}
          disabled={config.choices.length > choiceNode.choicePath.length &&
            config.choices[choiceNode.choicePath.length] ===
              choiceNode.myChoiceLevel!}
        />,
      )
      break
    }

    case "jump": {
      // Historical block: the jump was already taken — suppress the button.
      if (config.isHistorical) break

      const jumpNode = node as ActionNode
      if (!jumpNode.jumpTarget) {
        console.error("Jump node missing jumpTarget", jumpNode)
        break
      }
      result.push(
        <Button
          choiceId=">"
          onClick={() => navigateToBlock(jumpNode.jumpTarget || "")}
        >
          {`Continue ${jumpNode.jumpTarget ? `to ${jumpNode.jumpTarget}` : ""}`}
        </Button>,
      )
      break
    }

    case "debug":
      if (isDebugNode(node)) {
        result.push(
          <div
            class={clsx(
              "w-full py-2 px-4 rounded-sm border",
              getDebugNodeClass(node),
            )}
          >
            Type: {node.type}
            <br />
            {node.type === "scienceFact" || node.type === "scene"
              ? `NodeCommand: ${(node as CommandNode).command}`
              : null}
            <br />
            IdentionLevel: {node.identionLevel}
          </div>,
        )
      }
      break
  }

  return result
}
