import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import {
  ActionNode,
  Block,
  CommandNode,
  ContentNode,
  Story,
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


/**
 * Execute a set command to update story variables
 * Format: "variable to value" or "variable to value op number"
 */
function executeSetCommand(
  command: string,
  variables: Map<string, string | number | boolean>,
  errorReporter?: ErrorReporter,
): void {
  const reporter = errorReporter ?? new ErrorReporter()

  const [variableName, setCommand] = command.split(" to ").map((part) =>
    part.trim()
  )

  if (!variableName || !setCommand) {
    reporter.addError(
      `Invalid set command format: ${command}`,
      "set_error",
      { command },
    )
    return
  }

  const commandParts = setCommand.split(" ")

  // Simple set: "variable to value"
  if (commandParts.length === 1) {
    const value = parseSetValue(commandParts[0], variables, reporter)
    if (value !== null) {
      variables.set(variableName, value)
    }
    return
  }

  // Arithmetic set: "variable to var op number" (e.g., "score to $score + 10")
  if (commandParts.length === 3) {
    const [leftRaw, operator, rightRaw] = commandParts
    const leftValue = parseSetValue(leftRaw, variables, reporter) as number
    const rightValue = parseSetValue(rightRaw, variables, reporter) as number

    if (leftValue === null || rightValue === null) {
      return
    }

    let result: number

    switch (operator) {
      case "+":
        result = leftValue + rightValue
        break
      case "-":
        result = leftValue - rightValue
        break
      default:
        reporter.addError(
          `Invalid operator in set command: ${operator}`,
          "set_error",
          { operator },
        )
        return
    }

    variables.set(variableName, result)
    return
  }

  reporter.addError(
    `Invalid set command format: ${command}`,
    "set_error",
    { command },
  )
}

/**
 * Create handler for choice node clicks
 */
function createChoiceClickHandler(
  contentNodes: ContentNode[],
  currentIndex: number,
  setCurrentIndentionLevel: Dispatch<StateUpdater<number>>,
  currentIndentionLevel: number,
  choices: number[],
  setChoices: Dispatch<StateUpdater<number[]>>,
  setCurrentBlockTitle: Dispatch<StateUpdater<string>>,
): void {
  const node = contentNodes[currentIndex]

  if (node.type !== "choice") {
    console.error(
      `Expected a choice node at index ${currentIndex}, but got ${node.type}`,
    )
    return
  }

  if (node.myChoiceLevel === undefined) {
    console.error(
      `Choice node at index ${currentIndex} is missing myChoiceLevel`,
    )
    return
  }

  // Add this choice to the selected choices
  setChoices([...choices, node.myChoiceLevel])

  // Check if next node is a jump
  const nextNode = contentNodes[currentIndex + 1]
  if (nextNode?.type === "jump") {
    setCurrentBlockTitle((nextNode as ActionNode).jumpTarget || "")
    return
  }

  // Increase indentation level to show nested content
  setCurrentIndentionLevel(currentIndentionLevel + 1)
}

/**
 * Render a single content node to JSX
 */
function renderNode(
  node: ContentNode,
  index: number,
  contentNodes: ContentNode[],
  config: RenderConfig,
  visibleNodes: ContentNode[],
): JSX.Element[] {
  const result: JSX.Element[] = []

  if (!isNodeVisible(node, visibleNodes)) {
    return result
  }

  switch (getNodeType(node)) {
    case "text":
      result.push(
        <Text html={(node as TextNode).text} />,
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
      result.push(
        <MoodImage name={(node as CommandNode).command} />,
      )
      break

    case "set":
      config.handlers.onSetNode((node as CommandNode).command)
      break

    case "detour": {
      const detourNode = node as ActionNode
      result.push(<>DETOUR</>)
      break
    }

    case "choice": {
      const choiceNode = node as ActionNode

      result.push(
        <Button
          choiceId={String(choiceNode.myChoiceLevel)}
          onClick={() => {
            createChoiceClickHandler(
              contentNodes,
              index,
              config.handlers.setCurrentIndentionLevel!,
              config.indentionLevel,
              config.choices,
              config.handlers.setChoices!,
              config.handlers.onJumpClick,
            )
          }}
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
          onClick={() => {
            config.handlers.onJumpClick(jumpNode.jumpTarget || "")
          }}
        >
          {`Continue ${jumpNode.jumpTarget ? `to ${jumpNode.jumpTarget}` : ""}`}
        </Button>,
      )
      break
    }
    case "debug":
      if (isDebugNode(node)) {
        const debugClass = getDebugNodeClass(node)
        const className = clsx(
          "w-full py-2 px-4 rounded-sm border",
          debugClass,
        )
        result.push(
          <div class={className}>
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

interface StoryViewerProps {
  initialStory: Story
}

function StoryViewer({ initialStory }: StoryViewerProps) {
  const [currentBlock, setCurrentBlock] = useState<Block | undefined>(() => {
    initialStory.visitedBlocks.add("Start")
    return initialStory.blocks.get("Start")
  })

  const [currentBlockTitle, setCurrentBlockTitle] = useState("Start")
  const [currentIndentionLevel, setCurrentIndentionLevel] = useState(0)
  const [choices, setChoices] = useState<number[]>([])

  // Track block visits and reset state when block changes
  useEffect(() => {
    if (!initialStory.visitedBlocks.has(currentBlockTitle)) {
      initialStory.visitedBlocks.add(currentBlockTitle)
    }
    setCurrentBlock(initialStory.blocks.get(currentBlockTitle))
    setCurrentIndentionLevel(0)
    setChoices([])
  }, [currentBlockTitle])

  // Create render handlers
  const handlers: RenderHandlers = {
    onChoiceClick: (index: number) => {
      createChoiceClickHandler(
        currentBlock?.contentNodes || [],
        index,
        setCurrentIndentionLevel,
        currentIndentionLevel,
        choices,
        setChoices,
        setCurrentBlockTitle,
      )
    },
    onJumpClick: setCurrentBlockTitle,
    onSetNode: (command: string) => {
      executeSetCommand(command, initialStory.variables)
    },
    setCurrentIndentionLevel,
    setChoices,
  }

  // Create render context
  const context: RenderContext = {
    visitedBlocks: initialStory.visitedBlocks,
    variables: initialStory.variables,
  }

  // Create render config
  const renderConfig: RenderConfig = {
    contentNodes: currentBlock?.contentNodes || [],
    indentionLevel: currentIndentionLevel,
    choices,
    handlers,
    context,
  }

  const visibleNodes = filterVisibleNodes(
    renderConfig.contentNodes,
    renderConfig.choices,
    renderConfig.context,
  )

  // Render all nodes
  const renderedNodes = renderConfig.contentNodes
    .map((node, i) =>
      renderNode(
        node,
        i,
        renderConfig.contentNodes,
        renderConfig,
        visibleNodes,
      )
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
