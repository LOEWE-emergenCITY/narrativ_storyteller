import { useEffect } from "preact/hooks"
import { ContentNode } from "@/utils/storyTypes.tsx"
import {
  filterVisibleNodes,
  RenderConfig,
  RenderContext,
  RenderHandlers,
  renderNode,
} from "@/utils/nodeRenderer.tsx"
import {
  applyVariables,
  blockEntryVariables,
  blockHistory,
  choices,
  currentBlockTitle,
  currentIndentionLevel,
  navigateToBlock,
  seenOnceSections,
  storyBlocks,
  storyVariables,
  visibleOnceSections,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { buildNodeVariables } from "@/utils/setHandler.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"

// ── Module-level caches ───────────────────────────────────────────────────────

/**
 * Active-block cache: stores the node-variable snapshots and the post-all-sets
 * final variable state computed on the first render for each block title.
 * Keyed by block title so it resets automatically when the block changes, but
 * survives re-renders within the same block.
 * This prevents random() from being re-rolled on every re-render.
 */
const activeNodeVarsCache: {
  key: string
  vars: WeakMap<ContentNode, Map<string, string | number | boolean>>
  finalVars: Map<string, string | number | boolean>
} = { key: "", vars: new WeakMap(), finalVars: new Map() }

/**
 * Historical-block cache: keyed on the snapshot object reference (stable,
 * created once in navigateToBlock/selectChoice). Entries are GC-eligible once
 * the snapshot is removed from blockHistory (e.g. on resetGame).
 */
type HistorySnapshot = {
  title: string
  choices: number[]
  variables: Map<string, string | number | boolean>
  visitedBlocks: Set<string>
  seenOnceSections: Set<string>
}
const historicNodeVarsCache = new WeakMap<
  HistorySnapshot,
  WeakMap<ContentNode, Map<string, string | number | boolean>>
>()

function StoryViewer() {
  const blockTitle = currentBlockTitle.value
  const indentionLevel = currentIndentionLevel.value
  const currentChoices = choices.value
  const history = blockHistory.value

  // storyBlocks is populated by loadStory() before isLoggedIn is set to true,
  // so it is always available on the first render of this component.
  const block = storyBlocks.value.get(blockTitle)

  const context: RenderContext = {
    visitedBlocks: visitedBlocks.value,
    seenOnceSections: seenOnceSections.value,
    variables: storyVariables.value,
  }

  const contentNodes = block?.contentNodes || []
  const { visibleNodes, visibleOnceKeys } = filterVisibleNodes(
    contentNodes,
    currentChoices,
    context,
  )
  const visibleOnceSignature = `${blockTitle}:${
    [...visibleOnceKeys].sort().join("|")
  }`

  // Capture the previous active block's computed vars BEFORE potentially
  // overwriting the cache. These are needed when that block first enters
  // history later in this same render (history.map runs after this point).
  const prevActiveKey = activeNodeVarsCache.key
  const prevActiveVars = activeNodeVarsCache.vars

  // Compute per-node variable snapshots exactly once per block entry.
  // blockEntryVariables holds the pre-block state (set in the same batch as
  // currentBlockTitle), so random() and arithmetic are always evaluated from
  // the correct baseline and never re-rolled on subsequent re-renders.
  if (activeNodeVarsCache.key !== blockTitle) {
    const { nodeVars, finalVariables } = buildNodeVariables(
      visibleNodes,
      blockEntryVariables.value,
    )
    activeNodeVarsCache.key = blockTitle
    activeNodeVarsCache.vars = nodeVars
    activeNodeVarsCache.finalVars = finalVariables
  }
  const nodeVariables = activeNodeVarsCache.vars

  // Apply <<set>> results to storyVariables after render using the final
  // variable state already computed by buildNodeVariables — no second call to
  // computeSetUpdates, so random() is never re-rolled.
  useEffect(() => {
    if (!block) return
    applyVariables(activeNodeVarsCache.finalVars)
  }, [blockTitle])

  useEffect(() => {
    visibleOnceSections.value = new Set(visibleOnceKeys)
  }, [visibleOnceSignature])

  // Scroll to the newly appended block each time the active block changes.
  useEffect(() => {
    globalThis.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
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

  const activeRenderConfig: RenderConfig = {
    contentNodes,
    indentionLevel,
    choices: currentChoices,
    handlers,
    context,
    nodeVariables,
  }

  // ── Render historical blocks (read-only, frozen choices) ─────────────────

  const historicalSections = history.map((snapshot, sectionIndex) => {
    const historicBlock = storyBlocks.value.get(snapshot.title)
    if (!historicBlock) return null

    const frozenContext: RenderContext = {
      visitedBlocks: snapshot.visitedBlocks,
      seenOnceSections: snapshot.seenOnceSections,
      variables: snapshot.variables,
    }

    const frozenNodes = historicBlock.contentNodes
    const { visibleNodes: frozenVisible } = filterVisibleNodes(
      frozenNodes,
      snapshot.choices,
      frozenContext,
    )

    // Compute per-node variable snapshots once per snapshot object.
    // If this block just transitioned from active to historical in this render,
    // reuse the vars already computed while it was active — avoids re-rolling
    // random(). For older snapshots already in history, replay from
    // snapshot.variables (pre-block state, set via blockEntryVariables).
    let frozenNodeVariables = historicNodeVarsCache.get(snapshot)
    if (!frozenNodeVariables) {
      frozenNodeVariables = prevActiveKey === snapshot.title
        ? prevActiveVars
        : buildNodeVariables(frozenVisible, snapshot.variables).nodeVars
      historicNodeVarsCache.set(snapshot, frozenNodeVariables)
    }

    const historicConfig: RenderConfig = {
      contentNodes: frozenNodes,
      indentionLevel: 0,
      choices: snapshot.choices,
      handlers,
      context: frozenContext,
      nodeVariables: frozenNodeVariables,
      isHistorical: true,
    }

    const renderedHistoric = frozenNodes
      .map((node, i) =>
        renderNode(node, i, frozenNodes, historicConfig, frozenVisible)
      )
      .flat()

    return (
      <div key={`history-${sectionIndex}-${snapshot.title}`}>
        {renderedHistoric}
        <hr class="my-6 border-gray-200" />
      </div>
    )
  })

  // ── Render active block ──────────────────────────────────────────────────

  const renderedNodes = contentNodes
    .map((node, i) =>
      renderNode(node, i, contentNodes, activeRenderConfig, visibleNodes)
    )
    .flat()

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col">
        {historicalSections}
        {renderedNodes}
      </div>
    </div>
  )
}

export default StoryViewer
