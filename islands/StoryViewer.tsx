import { useEffect } from "preact/hooks"
import { CommandNode } from "@/utils/storyTypes.tsx"
import {
  filterVisibleNodes,
  RenderConfig,
  RenderContext,
  RenderHandlers,
} from "@/utils/nodeRenderers.ts"
import {
  applyVariables,
  choices,
  currentBlockTitle,
  currentIndentionLevel,
  navigateToBlock,
  storyBlocks,
  storyVariables,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { computeSetUpdates } from "@/utils/setHandler.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import { renderNode } from "@/utils/nodeRenderer.tsx"

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
