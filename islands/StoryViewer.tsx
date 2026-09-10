import { useEffect } from "preact/hooks"
import {
  ContinueButton,
  RestartButton,
  ReturnFromDetourButton,
} from "@/components/Button.tsx"
import {
  ActionNode,
  ChoiceState,
  ContentNode,
  RandomChoiceState,
} from "@/utils/storyTypes.tsx"
import {
  evaluateActiveBlockProgress,
  evaluateVisibleNodesSequentially,
  filterVisibleNodes,
  RenderContext,
} from "@/utils/nodeVisibility.ts"
import { RenderConfig, renderNode } from "@/utils/renderNode.tsx"
import {
  applyVariables,
  blockEntryVariables,
  blockHistory,
  choices,
  continueBranch,
  currentBlockTitle,
  detourReturnStack,
  navigateToBlock,
  navigateToDetour,
  navigateWithinDetour,
  randomChoices,
  resolveRandomChoices,
  resumeFromLine,
  returnFromDetour,
  seenOnceSections,
  storyBlocks,
  updateActiveBlockState,
  updateActiveRenderSnapshot,
  visibleOnceSections,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { buildNodeVariables } from "@/utils/setHandler.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import type { ActiveBlockStatus } from "@/utils/nodeVisibility.ts"

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
  evaluationSignature: string
  vars: WeakMap<ContentNode, Map<string, string | number | boolean>>
  finalVars: Map<string, string | number | boolean>
  visibleNodes: ContentNode[]
  visibleOnceKeys: Set<string>
  resolvedRandomChoices: RandomChoiceState
  progress: ReturnType<typeof evaluateActiveBlockProgress>
} = {
  key: "",
  evaluationSignature: "",
  vars: new WeakMap(),
  finalVars: new Map(),
  visibleNodes: [],
  visibleOnceKeys: new Set(),
  resolvedRandomChoices: {},
  progress: {
    status: "complete_without_continue",
    continueTarget: null,
    blockingChoicePathLength: null,
    detourReturnLine: null,
  },
}

/**
 * Historical-block cache: keyed on the snapshot object reference (stable,
 * created once in navigateToBlock/selectChoice). Entries are GC-eligible once
 * the snapshot is removed from blockHistory (e.g. on resetGame).
 */
type HistorySnapshot = {
  title: string
  startFromLine: number
  choices: ChoiceState
  randomChoices: RandomChoiceState
  variables: Map<string, string | number | boolean>
  visitedBlocks: Set<string>
  seenOnceSections: Set<string>
}
const historicNodeVarsCache = new WeakMap<
  HistorySnapshot,
  WeakMap<ContentNode, Map<string, string | number | boolean>>
>()

export function getChoiceShortcutIndex(
  contentNodes: ContentNode[],
  visibleNodes: ContentNode[],
  currentChoices: ChoiceState,
  key: string,
): number | null {
  const normalizedKey = key.toUpperCase()
  if (!/^[1-9A-Z]$/.test(normalizedKey)) return null

  const choiceIndex = contentNodes.findIndex((node) => {
    if (!visibleNodes.includes(node) || node.type !== "choice") return false

    const choiceNode = node as ActionNode
    if (getChoiceShortcutLabel(choiceNode.myChoiceLevel) !== normalizedKey) {
      return false
    }

    return choiceNode.choiceBlockId === undefined ||
      currentChoices[String(choiceNode.choiceBlockId)] !==
        choiceNode.myChoiceLevel
  })

  return choiceIndex === -1 ? null : choiceIndex
}

export function getChoiceShortcutLabel(choiceLevel?: number): string | null {
  if (choiceLevel === undefined || choiceLevel < 1 || choiceLevel > 35) {
    return null
  }

  if (choiceLevel <= 9) return String(choiceLevel)

  return String.fromCharCode("A".charCodeAt(0) + choiceLevel - 10)
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

export function shouldShowRestartButton(
  blockTitle: string,
  status: ActiveBlockStatus,
  detourStackLength: number,
): boolean {
  return blockTitle === "End" && status === "complete_without_continue" &&
    detourStackLength === 0
}

function StoryViewer({ onRestart }: { onRestart: () => void }) {
  const blockTitle = currentBlockTitle.value
  const currentChoices = choices.value
  const currentRandomChoices = randomChoices.value
  const history = blockHistory.value
  const currentResumeFromLine = resumeFromLine.value
  const detourStack = detourReturnStack.value
  const showDetourDebug = new URLSearchParams(globalThis.location.search).get(
    "detourDebug",
  ) === "1"

  // storyBlocks is populated by loadStory() before isLoggedIn is set to true,
  // so it is always available on the first render of this component.
  const block = storyBlocks.value.get(blockTitle)

  const context: RenderContext = {
    visitedBlocks: visitedBlocks.value,
    seenOnceSections: seenOnceSections.value,
    variables: blockEntryVariables.value,
  }

  // Apply the resume-from-line offset so only the post-detour portion of the
  // origin block is evaluated and rendered as the active section.
  const contentNodes = (block?.contentNodes || []).slice(currentResumeFromLine)
  const resumeOptions = currentResumeFromLine > 0
    ? {
      resumeStartIndent: block?.contentNodes[currentResumeFromLine]
        ?.identionLevel,
    }
    : undefined

  // Capture the previous active block's computed vars BEFORE potentially
  // overwriting the cache. These are needed when that block first enters
  // history later in this same render (history.map runs after this point).
  const prevActiveKey = activeNodeVarsCache.key
  const prevActiveVars = activeNodeVarsCache.vars

  // resumeFromLine is included so the cache invalidates correctly when
  // returning to the same block at a different offset (multiple detours).
  const evaluationSignature = JSON.stringify({
    blockTitle,
    resumeFromLine: currentResumeFromLine,
    choices: currentChoices,
    randomChoices: currentRandomChoices,
    visitedBlocks: [...visitedBlocks.value].sort(),
    seenOnceSections: [...seenOnceSections.value].sort(),
    variables: [...blockEntryVariables.value.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    ),
    resumeStartIndent: resumeOptions?.resumeStartIndent,
  })

  if (
    activeNodeVarsCache.key !== blockTitle ||
    activeNodeVarsCache.evaluationSignature !== evaluationSignature
  ) {
    const sequentialResult = evaluateVisibleNodesSequentially(
      contentNodes,
      currentChoices,
      currentRandomChoices,
      context,
      resumeOptions,
    )
    activeNodeVarsCache.key = blockTitle
    activeNodeVarsCache.evaluationSignature = evaluationSignature
    activeNodeVarsCache.vars = sequentialResult.nodeVariables
    activeNodeVarsCache.finalVars = sequentialResult.finalVariables
    activeNodeVarsCache.visibleNodes = sequentialResult.visibleNodes
    activeNodeVarsCache.visibleOnceKeys = sequentialResult.visibleOnceKeys
    activeNodeVarsCache.resolvedRandomChoices =
      sequentialResult.resolvedRandomChoices
    activeNodeVarsCache.progress = evaluateActiveBlockProgress(
      contentNodes,
      sequentialResult.visibleNodes,
      currentChoices,
    )
  }

  const visibleNodes = activeNodeVarsCache.visibleNodes
  const visibleOnceKeys = activeNodeVarsCache.visibleOnceKeys
  const visibleOnceSignature = `${blockTitle}:${
    [...visibleOnceKeys].sort().join("|")
  }`
  const activeBlockProgress = activeNodeVarsCache.progress

  const nodeVariables = activeNodeVarsCache.vars

  // Apply <<set>> results to storyVariables after render using the final
  // variable state already computed by the sequential evaluation pass.
  useEffect(() => {
    if (!block) return
    applyVariables(activeNodeVarsCache.finalVars)
    resolveRandomChoices(activeNodeVarsCache.resolvedRandomChoices)
  }, [blockTitle, evaluationSignature])

  useEffect(() => {
    if (
      activeBlockProgress.status === "auto_jump_now" ||
      activeBlockProgress.status === "auto_detour_now" ||
      activeBlockProgress.status === "ready_to_detour"
    ) {
      return
    }

    updateActiveBlockState(
      activeBlockProgress.status,
      activeBlockProgress.continueTarget,
    )
  }, [
    activeBlockProgress.status,
    activeBlockProgress.continueTarget,
  ])

  useEffect(() => {
    visibleOnceSections.value = new Set(visibleOnceKeys)
  }, [visibleOnceSignature])

  useEffect(() => {
    updateActiveRenderSnapshot({
      visibleNodes: visibleNodes.map((node) => ({
        index: currentResumeFromLine + contentNodes.indexOf(node),
        variables: Object.fromEntries(
          (nodeVariables.get(node) ?? context.variables).entries(),
        ),
      })),
      visibleOnceKeys: [...visibleOnceKeys],
    })
  }, [blockTitle, evaluationSignature])

  useEffect(() => {
    if (
      (activeBlockProgress.status !== "auto_jump_now" &&
        activeBlockProgress.status !== "auto_detour_now" &&
        activeBlockProgress.status !== "ready_to_detour") ||
      activeBlockProgress.continueTarget === null
    ) {
      return
    }

    if (activeBlockProgress.status === "auto_jump_now") {
      if (detourStack.length > 0) {
        navigateWithinDetour(activeBlockProgress.continueTarget)
      } else {
        navigateToBlock(activeBlockProgress.continueTarget)
      }
      return
    }

    navigateToDetour(activeBlockProgress.continueTarget, {
      title: blockTitle,
      line: activeBlockProgress.detourReturnLine ?? 0,
      choices: { ...currentChoices },
      randomChoices: { ...currentRandomChoices },
    })
  }, [
    activeBlockProgress.status,
    activeBlockProgress.continueTarget,
    activeBlockProgress.detourReturnLine,
    blockTitle,
    currentChoices,
    currentRandomChoices,
    detourStack.length,
  ])

  const activeRenderConfig: RenderConfig = {
    choices: currentChoices,
    context,
    getChoiceShortcutLabel,
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

    // Apply startFromLine so each history segment only shows its own portion.
    const startFromLine = snapshot.startFromLine ?? 0
    const frozenNodes = historicBlock.contentNodes.slice(startFromLine)
    const frozenResumeOptions = startFromLine > 0
      ? {
        resumeStartIndent: historicBlock.contentNodes[startFromLine]
          ?.identionLevel,
      }
      : undefined
    const snapshotNodes = snapshot.renderSnapshot?.visibleNodes ?? null
    const frozenVisible = snapshotNodes
      ? snapshotNodes
        .map((item) => historicBlock.contentNodes[item.index])
        .filter((node): node is ContentNode => Boolean(node))
      : filterVisibleNodes(
        frozenNodes,
        snapshot.choices,
        snapshot.randomChoices,
        frozenContext,
        frozenResumeOptions,
      ).visibleNodes

    // Prefer stored active render snapshots so history is a transcript, not a
    // re-simulation. The fallback supports old in-memory snapshots without it.
    let frozenNodeVariables: WeakMap<
      ContentNode,
      Map<string, string | number | boolean>
    >
    if (snapshotNodes) {
      frozenNodeVariables = new WeakMap()
      snapshotNodes.forEach((item) => {
        const node = historicBlock.contentNodes[item.index]
        if (node) {
          frozenNodeVariables.set(node, new Map(Object.entries(item.variables)))
        }
      })
    } else {
      const cachedVariables = historicNodeVarsCache.get(snapshot)
      if (cachedVariables) {
        frozenNodeVariables = cachedVariables
      } else {
        frozenNodeVariables = prevActiveKey === snapshot.title
          ? prevActiveVars
          : buildNodeVariables(frozenVisible, snapshot.variables).nodeVars
        historicNodeVarsCache.set(snapshot, frozenNodeVariables)
      }
    }

    const historicConfig: RenderConfig = {
      choices: snapshot.choices,
      context: frozenContext,
      nodeVariables: frozenNodeVariables,
      isHistorical: true,
      showDetourDebug,
    }

    const renderedHistoric = snapshotNodes
      ? snapshotNodes.flatMap((item) => {
        const node = historicBlock.contentNodes[item.index]
        if (!node) return []
        return renderNode(
          node,
          item.index,
          historicBlock.contentNodes,
          historicConfig,
          frozenVisible,
        )
      })
      : frozenNodes
        .map((node, i) =>
          renderNode(node, i, frozenNodes, historicConfig, frozenVisible)
        )
        .flat()

    return (
      <div key={`history-${sectionIndex}-${snapshot.title}`}>
        {renderedHistoric}
      </div>
    )
  })

  // ── Render active block ──────────────────────────────────────────────────

  const renderedNodes = contentNodes
    .map((node, i) =>
      renderNode(node, i, contentNodes, activeRenderConfig, visibleNodes)
    )
    .flat()

  // ── Determine which action button to show ────────────────────────────────

  // Two continue-style buttons remain user-driven: normal visible jumps and
  // returning from a detour. Entering detours is automatic.

  const showContinue = activeBlockProgress.status === "ready_to_continue" &&
    activeBlockProgress.continueTarget !== null

  const showReturn =
    activeBlockProgress.status === "complete_without_continue" &&
    detourStack.length > 0

  const showRestart = shouldShowRestartButton(
    blockTitle,
    activeBlockProgress.status,
    detourStack.length,
  )

  useEffect(() => {
    function handleStoryKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditableShortcutTarget(event.target)
      ) {
        return
      }

      if (event.key === "Enter") {
        if (showContinue) {
          event.preventDefault()
          continueBranch()
          return
        }

        if (showReturn) {
          event.preventDefault()
          returnFromDetour()
        }

        return
      }

      const choiceIndex = getChoiceShortcutIndex(
        contentNodes,
        visibleNodes,
        currentChoices,
        event.key,
      )

      if (choiceIndex === null) return

      event.preventDefault()
      handleChoiceClick(contentNodes, choiceIndex)
    }

    globalThis.addEventListener("keydown", handleStoryKeyDown)

    return () => {
      globalThis.removeEventListener("keydown", handleStoryKeyDown)
    }
  }, [
    contentNodes,
    currentChoices,
    showContinue,
    showReturn,
    visibleNodes,
  ])

  return (
    <div class="mx-auto min-h-[calc(100dvh-var(--app-header-height)-var(--app-footer-height))] bg-app-bg px-4 py-8 text-theme">
      <div class="mx-auto flex max-w-3xl flex-col">
        {historicalSections}
        {renderedNodes}
        {showContinue && <ContinueButton onClick={() => continueBranch()} />}
        {showReturn && (
          <ReturnFromDetourButton onClick={() => returnFromDetour()} />
        )}
        {showRestart && <RestartButton onClick={onRestart} />}
      </div>
    </div>
  )
}

export default StoryViewer
