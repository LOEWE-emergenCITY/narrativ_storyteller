import {
  ActionNode,
  Block,
  ConditionNode,
  ContentNode,
  Story,
} from "@/utils/storyParser.ts"
import { useEffect, useState } from "preact/hooks"
import type { ComponentChildren } from "preact"
import { LineRenderer } from "@/components/LineRenderer.tsx"
import { ActionRenderer } from "@/components/ActionRenderer.tsx"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"

interface DetourReturn {
  blockTitle: string
  lineIndex: number
}

function isActionNode(node: ContentNode): node is ActionNode {
  return node &&
    (node.type === "choice" || node.type === "jump" || node.type === "detour")
}

function isConditionNode(node: ContentNode): node is ConditionNode {
  return node &&
    (node.type === "if" || node.type === "elseif" || node.type === "else" ||
      node.type === "endif" || node.type === "once" || node.type === "endonce")
}

export default function StoryViewer({ initialStory }: { initialStory: Story }) {
  const [currentBlock, setCurrentBlock] = useState<Block | undefined>(
    initialStory.blocks.get("Start"),
  )
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isWaitingForInput, setIsWaitingForInput] = useState(false)
  const [pendingActions, setPendingActions] = useState<ActionNode[]>([])
  const [renderedLines, setRenderedLines] = useState<ComponentChildren[]>([])
  const [detourReturnLocation, setDetourReturnLocation] = useState<
    DetourReturn | null
  >(null)

  /**
   * useEffect: Trigger render loop when block or line index changes
   */
  useEffect(() => {
    if (!isWaitingForInput) {
      renderFromLine(currentLineIndex)
    }
  }, [currentBlock, currentLineIndex, isWaitingForInput])

  if (!currentBlock) {
    return <Text>Block not found</Text>
  }

  /**
   * Main render loop: Process lines from startIndex until an ActionNode is encountered
   */
  const renderFromLine = (startIndex: number) => {
    // Convert Map to sorted array by keys (line numbers)
    const sortedLines = Array.from(currentBlock.contentLines.entries())
      .sort((a, b) => a[0] - b[0])

    const elements: ComponentChildren[] = []
    const actions: ActionNode[] = []
    let currentIndex = startIndex

    while (currentIndex < sortedLines.length) {
      const [lineNum, lineContent] = sortedLines[currentIndex]

      // Condition nodes: show but continue (ignore evaluation for now)
      if (isConditionNode(lineContent)) {
        elements.push(
          <LineRenderer
            key={`line-${lineNum}`}
            line={lineContent}
            index={lineNum}
          />,
        )
        currentIndex++
        continue
      }

      // Action nodes: collect and stop rendering
      if (isActionNode(lineContent)) {
        actions.push(lineContent)
        break // Stop loop, wait for user input
      }

      // Regular content: render and continue
      elements.push(
        <LineRenderer
          key={`line-${lineNum}`}
          line={lineContent}
          index={lineNum}
        />,
      )
      currentIndex++
    }

    setRenderedLines(elements)
    setPendingActions(actions)
    setIsWaitingForInput(actions.length > 0)
  }

  /**
   * Handle action button clicks
   * - string target: jump/detour to another block
   * - number target: continue from line number in current block
   */
  const handleActionSelect = (
    target: string | number,
    isDetour: boolean = false,
  ) => {
    if (typeof target === "string") {
      // Jump or Detour to another block
      const nextBlock = initialStory.blocks.get(target)
      if (nextBlock) {
        // For detour, save return location
        if (isDetour) {
          setDetourReturnLocation({
            blockTitle: currentBlock.title,
            lineIndex: currentLineIndex,
          })
        }
        setCurrentBlock(nextBlock)
        setCurrentLineIndex(0)
      }
    } else {
      // Continue from line number within current block
      setCurrentLineIndex(target)
    }

    setPendingActions([])
    setIsWaitingForInput(false)
  }

  /**
   * Handle return from detour
   */
  const handleDetourReturn = () => {
    if (!detourReturnLocation) return

    const returnBlock = initialStory.blocks.get(detourReturnLocation.blockTitle)
    if (returnBlock) {
      setCurrentBlock(returnBlock)
      setCurrentLineIndex(detourReturnLocation.lineIndex)
      setDetourReturnLocation(null)
      setPendingActions([])
      setIsWaitingForInput(false)
    }
  }

  // Override handleActionSelect to pass isDetour flag
  const handleActionSelectWithDetour = (target: string | number) => {
    // Check if this is a detour action
    const pendingDetour = pendingActions.find((a) => a.type === "detour")
    const isDetour = pendingDetour !== undefined && typeof target === "string"

    handleActionSelect(target, isDetour)
  }

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col">
        {/* Render all processed lines */}
        {renderedLines}

        {/* Show actions if waiting for input */}
        {isWaitingForInput && pendingActions.length > 0 && (
          <ActionRenderer
            actions={pendingActions}
            currentBlock={currentBlock}
            onActionSelect={handleActionSelectWithDetour}
          />
        )}

        {/* Show detour return button if we're in a detour */}
        {detourReturnLocation && (
          <div class="mt-4 pt-4 border-t border-gray-300">
            <Button
              onClick={handleDetourReturn}
            >
              Return to {detourReturnLocation.blockTitle}
            </Button>
          </div>
        )}

        {/* Debug info */}
        <div class="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <p>Block: {currentBlock.title}</p>
          <p>Line Index: {currentLineIndex}</p>
          <p>Total Lines: {currentBlock.contentLines.size}</p>
        </div>
      </div>
    </div>
  )
}
