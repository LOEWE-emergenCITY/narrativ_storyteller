import { useEffect } from "preact/hooks"
import {
  ActionNode,
  CommandNode,
  ContentNode,
  TextNode,
} from "@/utils/storyTypes.tsx"
import {
  filterVisibleNodes,
  getDebugNodeClass,
  getNodeType,
  isDebugNode,
  isNodeVisible,
  RenderConfig,
  RenderContext,
  RenderHandlers,
} from "@/utils/nodeRenderers.ts"
import { parseSetValue } from "@/utils/valueParser.ts"
import { ErrorReporter } from "@/utils/errorReporter.ts"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { MoodImage } from "@/components/MoodImage.tsx"
import { Chat } from "@/components/Chat.tsx"
import { clsx } from "clsx"
import { JSX } from "preact/jsx-runtime"
import {
  applyVariables,
  choices,
  currentBlockTitle,
  currentIndentionLevel,
  navigateToBlock,
  selectChoice,
  storyBlocks,
  storyVariables,
  visitedBlocks,
} from "@/utils/storyStore.ts"

// ===== SET COMMAND HELPERS =====

/**
 * Compute variable updates from <<set>> command strings without touching any
 * signal. Runs in a useEffect after render to avoid mutating signals mid-render
 * (which would cause an infinite render loop on blocks with <<set>> nodes).
 */
function computeSetUpdates(
  commands: string[],
  variables: Map<string, string | number | boolean>,
): Map<string, string | number | boolean> {
  const updated = new Map(variables)
  const reporter = new ErrorReporter()

  for (const command of commands) {
    const [variableName, setCommand] = command.split(" to ").map((p) =>
      p.trim()
    )
    if (!variableName || !setCommand) continue

    const parts = setCommand.split(" ")

    if (parts.length === 1) {
      const value = parseSetValue(parts[0], updated, reporter)
      if (value !== null) updated.set(variableName, value)
    } else if (parts.length === 3) {
      const [leftRaw, operator, rightRaw] = parts
      const left = parseSetValue(leftRaw, updated, reporter) as number
      const right = parseSetValue(rightRaw, updated, reporter) as number
      if (left !== null && right !== null) {
        if (operator === "+") updated.set(variableName, left + right)
        else if (operator === "-") updated.set(variableName, left - right)
      }
    }
  }

  return updated
}

// ===== CHOICE HANDLER =====

/**
 * Handle a choice click as a single batched store action.
 * Checks if the next node is a jump to resolve the navigation target.
 */
function handleChoiceClick(
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

// ===== NODE RENDERER =====

function renderNode(
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
      result.push(<Text html={(node as TextNode).text} />)
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

// ===== COMPONENT =====

function StoryViewer() {
  const blockTitle = currentBlockTitle.value
  const indentionLevel = currentIndentionLevel.value
  const currentChoices = choices.value

  // storyBlocks is populated by loadStory() before isLoggedIn is set to true,
  // so it is always available on the first render of this component.
  const block = storyBlocks.value.get(blockTitle)

  const context: RenderContext = {
    visitedBlocks: visitedBlocks.value,
    variables: storyVariables.value,
  }

  const contentNodes = block?.contentNodes || []
  const visibleNodes = filterVisibleNodes(contentNodes, currentChoices, context)

  // Execute <<set>> commands after render to avoid signal writes mid-render.
  useEffect(() => {
    if (!block) return
    const setCommands = visibleNodes
      .filter((n) => n.type === "set")
      .map((n) => (n as CommandNode).command)
    if (setCommands.length === 0) return
    applyVariables(computeSetUpdates(setCommands, storyVariables.value))
  }, [blockTitle])

  const handlers: RenderHandlers = {
    onChoiceClick: (index: number) => handleChoiceClick(contentNodes, index),
    onJumpClick: navigateToBlock,
    onSetNode: (_command: string) => {},
    setCurrentIndentionLevel: (updater) => {
      currentIndentionLevel.value = typeof updater === "function"
        ? updater(currentIndentionLevel.value)
        : updater
    },
    setChoices: (updater) => {
      choices.value = typeof updater === "function"
        ? updater(choices.value)
        : updater
    },
  }

  const renderConfig: RenderConfig = {
    contentNodes,
    indentionLevel,
    choices: currentChoices,
    handlers,
    context,
  }

  const renderedNodes = contentNodes
    .map((node, i) =>
      renderNode(node, i, contentNodes, renderConfig, visibleNodes)
    )
    .flat()

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col">
        {renderedNodes}
      </div>
    </div>
  )
}

export default StoryViewer
