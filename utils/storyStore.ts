import { batch, signal } from "@preact/signals"
import { applySetCommands } from "@/utils/setHandler.ts"
import {
  ActionNode,
  Block,
  ChoiceState,
  CommandNode,
  DetourReturn,
  RandomChoiceState,
  Story,
} from "@/utils/storyTypes.tsx"
import type { ActiveBlockStatus } from "@/utils/nodeVisibility.ts"

export const STORY_STATE_STORAGE_KEY = "narrativ.storyState"
export const STORY_STATE_VERSION = 2

// ===== SIGNALS =====

export const storyBlocks = signal<Map<string, Block>>(new Map())
export const visitedBlocks = signal<Set<string>>(new Set())
export const seenOnceSections = signal<Set<string>>(new Set())
export const visibleOnceSections = signal<Set<string>>(new Set())
export const scienceFacts = signal<Record<string, string>>({})
export const storyVariables = signal<Map<string, string | number | boolean>>(
  new Map(),
)
export const currentBlockTitle = signal<string>("Start")
export const currentIndentionLevel = signal<number>(0)
export const choices = signal<ChoiceState>({})
export const randomChoices = signal<RandomChoiceState>({})
export const activeBlockStatus = signal<ActiveBlockStatus>(
  "complete_without_continue",
)
export const pendingContinueTarget = signal<string | null>(null)
export const isLoggedIn = signal<boolean>(false)

/**
 * Stack of pending detour returns. Non-empty means we are currently inside a
 * detour. The top entry records where to resume in the origin block when the
 * detour block ends without a jump.
 */
export const detourReturnStack = signal<DetourReturn[]>([])

/**
 * The contentNodes index from which the active block should be evaluated and
 * rendered. 0 means from the beginning (normal case). Set to a positive value
 * when returning from a detour so only the post-detour portion of the origin
 * block is shown as the current active section.
 */
export const resumeFromLine = signal<number>(0)

/**
 * Variable state at the moment the current block was entered — i.e. before any
 * <<set>> commands in this block have run. Used as the baseline for
 * buildNodeVariables so set-command replays always start from the correct
 * pre-block values (avoids double-applying arithmetic and re-rolling random()).
 */
export const blockEntryVariables = signal<
  Map<string, string | number | boolean>
>(
  new Map(),
)

/**
 * Ordered list of completed blocks. Each entry captures the block title,
 * the final choices array, and a frozen snapshot of variables and visitedBlocks
 * at the moment the reader navigated away, so the block can be re-rendered
 * read-only with the exact state it was left in.
 *
 * `startFromLine` records the contentNodes slice offset for this snapshot.
 * Blocks that are split by detours appear as multiple consecutive entries with
 * different `startFromLine` values (0 for the first half, N for later halves).
 */
export const blockHistory = signal<
  Array<{
    title: string
    startFromLine: number
    choices: ChoiceState
    randomChoices: RandomChoiceState
    variables: Map<string, string | number | boolean>
    visitedBlocks: Set<string>
    seenOnceSections: Set<string>
  }>
>([])

export type StoryValue = string | number | boolean

function cloneChoices(value: ChoiceState): ChoiceState {
  return { ...value }
}

function cloneRandomChoices(value: RandomChoiceState): RandomChoiceState {
  return { ...value }
}

export interface SavedBlockSnapshot {
  title: string
  startFromLine: number
  choices: ChoiceState
  randomChoices?: RandomChoiceState
  variables: Record<string, StoryValue>
  visitedBlocks: string[]
  seenOnceSections: string[]
}

export interface SavedStoryState {
  version: number
  storyFile: string
  hasStarted: boolean
  currentBlockTitle: string
  currentIndentionLevel: number
  choices: ChoiceState
  randomChoices?: RandomChoiceState
  storyVariables: Record<string, StoryValue>
  visitedBlocks: string[]
  seenOnceSections: string[]
  visibleOnceSections: string[]
  blockEntryVariables: Record<string, StoryValue>
  activeBlockStatus: ActiveBlockStatus
  pendingContinueTarget: string | null
  blockHistory: SavedBlockSnapshot[]
  detourReturnStack: Array<
    {
      title: string
      line: number
      choices: ChoiceState
      randomChoices?: RandomChoiceState
    }
  >
  resumeFromLine: number
}

// ===== ACTIONS =====

function resolveInitialStoryState(story: Story): {
  initialBlockTitle: string
  initialVariables: Map<string, string | number | boolean>
  initialVisitedBlocks: Set<string>
} {
  const baseVariables = new Map(story.variables)
  const startBlock = story.blocks.get("Start")

  if (!startBlock) {
    return {
      initialBlockTitle: "Start",
      initialVariables: baseVariables,
      initialVisitedBlocks: new Set(["Start"]),
    }
  }

  const bootstrapOnly = startBlock.contentNodes.every((node) =>
    node.type === "set" || node.type === "jump"
  )

  if (!bootstrapOnly) {
    return {
      initialBlockTitle: "Start",
      initialVariables: baseVariables,
      initialVisitedBlocks: new Set(["Start"]),
    }
  }

  const jumpNode = startBlock.contentNodes.find((node) =>
    node.type === "jump"
  ) as
    | ActionNode
    | undefined

  if (!jumpNode?.jumpTarget) {
    return {
      initialBlockTitle: "Start",
      initialVariables: baseVariables,
      initialVisitedBlocks: new Set(["Start"]),
    }
  }

  const startupCommands = startBlock.contentNodes
    .filter((node): node is CommandNode => node.type === "set")
    .map((node) => node.command)

  return {
    initialBlockTitle: jumpNode.jumpTarget,
    initialVariables: applySetCommands(startupCommands, baseVariables),
    initialVisitedBlocks: new Set(["Start", jumpNode.jumpTarget]),
  }
}

/**
 * Seed the store from a server-parsed Story.
 * Reconstructs Map/Set defensively — Fresh island serialization can convert
 * them to plain objects/arrays before they reach the client.
 */
export function loadStory(story: Story): void {
  const blocks = story.blocks instanceof Map
    ? story.blocks
    : new Map(Object.entries(story.blocks as unknown as Record<string, Block>))

  const variables = story.variables instanceof Map
    ? new Map(story.variables)
    : new Map(
      Object.entries(
        story.variables as unknown as Record<string, string | number | boolean>,
      ),
    )

  const initialStory = resolveInitialStoryState({
    ...story,
    blocks,
    variables,
  })

  batch(() => {
    storyBlocks.value = blocks
    storyVariables.value = initialStory.initialVariables
    blockEntryVariables.value = new Map(initialStory.initialVariables)
    visitedBlocks.value = initialStory.initialVisitedBlocks
    seenOnceSections.value = new Set()
    visibleOnceSections.value = new Set()
    currentBlockTitle.value = initialStory.initialBlockTitle
    currentIndentionLevel.value = 0
    choices.value = {}
    randomChoices.value = {}
    activeBlockStatus.value = "complete_without_continue"
    pendingContinueTarget.value = null
    blockHistory.value = []
    detourReturnStack.value = []
    resumeFromLine.value = 0
  })
}

export function loadScienceFacts(facts: Record<string, string>): void {
  scienceFacts.value = { ...facts }
}

function mapToRecord(
  values: Map<string, StoryValue>,
): Record<string, StoryValue> {
  return Object.fromEntries(values.entries())
}

function recordToMap(
  values: Record<string, StoryValue>,
): Map<string, StoryValue> {
  return new Map(Object.entries(values))
}

function isStoryValue(value: unknown): value is StoryValue {
  return typeof value === "string" || typeof value === "number" ||
    typeof value === "boolean"
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isChoiceState(value: unknown): value is ChoiceState {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "number")
}

function isStoryValueRecord(
  value: unknown,
): value is Record<string, StoryValue> {
  return typeof value === "object" && value !== null &&
    Object.values(value).every(isStoryValue)
}

function isSavedBlockSnapshot(value: unknown): value is SavedBlockSnapshot {
  if (typeof value !== "object" || value === null) return false

  const snapshot = value as Partial<SavedBlockSnapshot>
  return typeof snapshot.title === "string" &&
    (snapshot.startFromLine === undefined ||
      typeof snapshot.startFromLine === "number") &&
    isChoiceState(snapshot.choices) &&
    (snapshot.randomChoices === undefined ||
      isChoiceState(snapshot.randomChoices)) &&
    isStoryValueRecord(snapshot.variables) &&
    isStringArray(snapshot.visitedBlocks) &&
    isStringArray(snapshot.seenOnceSections)
}

function isActiveBlockStatus(value: unknown): value is ActiveBlockStatus {
  return value === "waiting_for_choice" || value === "auto_jump_now" ||
    value === "resolving_branch" || value === "ready_to_continue" ||
    value === "complete_without_continue" || value === "ready_to_detour" ||
    value === "auto_detour_now"
}

export function getSavedStoryState(
  storyFile: string,
  hasStarted: boolean,
): SavedStoryState {
  return {
    version: STORY_STATE_VERSION,
    storyFile,
    hasStarted,
    currentBlockTitle: currentBlockTitle.value,
    currentIndentionLevel: currentIndentionLevel.value,
    choices: cloneChoices(choices.value),
    randomChoices: cloneRandomChoices(randomChoices.value),
    storyVariables: mapToRecord(storyVariables.value),
    visitedBlocks: [...visitedBlocks.value],
    seenOnceSections: [...seenOnceSections.value],
    visibleOnceSections: [...visibleOnceSections.value],
    blockEntryVariables: mapToRecord(blockEntryVariables.value),
    activeBlockStatus: activeBlockStatus.value,
    pendingContinueTarget: pendingContinueTarget.value,
    blockHistory: blockHistory.value.map((snapshot) => ({
      title: snapshot.title,
      startFromLine: snapshot.startFromLine,
      choices: cloneChoices(snapshot.choices),
      randomChoices: cloneRandomChoices(snapshot.randomChoices),
      variables: mapToRecord(snapshot.variables),
      visitedBlocks: [...snapshot.visitedBlocks],
      seenOnceSections: [...snapshot.seenOnceSections],
    })),
    detourReturnStack: detourReturnStack.value.map((entry) => ({
      title: entry.title,
      line: entry.line,
      choices: cloneChoices(entry.choices),
      randomChoices: cloneRandomChoices(entry.randomChoices),
    })),
    resumeFromLine: resumeFromLine.value,
  }
}

export function restoreSavedStoryState(savedState: SavedStoryState): void {
  batch(() => {
    currentBlockTitle.value = savedState.currentBlockTitle
    currentIndentionLevel.value = savedState.currentIndentionLevel
    choices.value = cloneChoices(savedState.choices)
    randomChoices.value = cloneRandomChoices(savedState.randomChoices ?? {})
    storyVariables.value = recordToMap(savedState.storyVariables)
    visitedBlocks.value = new Set(savedState.visitedBlocks)
    seenOnceSections.value = new Set(savedState.seenOnceSections)
    visibleOnceSections.value = new Set(savedState.visibleOnceSections)
    blockEntryVariables.value = recordToMap(savedState.blockEntryVariables)
    activeBlockStatus.value = savedState.activeBlockStatus
    pendingContinueTarget.value = savedState.pendingContinueTarget
    blockHistory.value = savedState.blockHistory.map((snapshot) => ({
      title: snapshot.title,
      startFromLine: snapshot.startFromLine ?? 0,
      choices: cloneChoices(snapshot.choices),
      randomChoices: cloneRandomChoices(snapshot.randomChoices ?? {}),
      variables: recordToMap(snapshot.variables),
      visitedBlocks: new Set(snapshot.visitedBlocks),
      seenOnceSections: new Set(snapshot.seenOnceSections),
    }))
    detourReturnStack.value = (savedState.detourReturnStack ?? []).map(
      (entry) => ({
        title: entry.title,
        line: entry.line,
        choices: cloneChoices(entry.choices),
        randomChoices: cloneRandomChoices(entry.randomChoices ?? {}),
      }),
    )
    resumeFromLine.value = savedState.resumeFromLine ?? 0
  })
}

export function isSavedStoryState(value: unknown): value is SavedStoryState {
  if (typeof value !== "object" || value === null) return false

  const savedState = value as Partial<SavedStoryState>
  return savedState.version === STORY_STATE_VERSION &&
    typeof savedState.storyFile === "string" &&
    typeof savedState.hasStarted === "boolean" &&
    typeof savedState.currentBlockTitle === "string" &&
    typeof savedState.currentIndentionLevel === "number" &&
    isChoiceState(savedState.choices) &&
    (savedState.randomChoices === undefined ||
      isChoiceState(savedState.randomChoices)) &&
    isStoryValueRecord(savedState.storyVariables) &&
    isStringArray(savedState.visitedBlocks) &&
    isStringArray(savedState.seenOnceSections) &&
    isStringArray(savedState.visibleOnceSections) &&
    isStoryValueRecord(savedState.blockEntryVariables) &&
    isActiveBlockStatus(savedState.activeBlockStatus) &&
    (savedState.pendingContinueTarget === null ||
      typeof savedState.pendingContinueTarget === "string") &&
    Array.isArray(savedState.blockHistory) &&
    savedState.blockHistory.every(isSavedBlockSnapshot) &&
    (savedState.detourReturnStack === undefined ||
      Array.isArray(savedState.detourReturnStack)) &&
    (savedState.resumeFromLine === undefined ||
      typeof savedState.resumeFromLine === "number")
}

/**
 * Advance to a new block, mark it visited, and reset per-block navigation.
 * Snapshots the leaving block into blockHistory so it can be rendered
 * read-only as part of the accumulated story view.
 *
 * A jump always cancels any active detour — the return stack is cleared and
 * the resume offset is reset.
 */
export function navigateToBlock(title: string): void {
  batch(() => {
    const consumedOnceSections = new Set([
      ...seenOnceSections.value,
      ...visibleOnceSections.value,
    ])
    blockHistory.value = [
      ...blockHistory.value,
      {
        title: currentBlockTitle.value,
        startFromLine: resumeFromLine.value,
        choices: cloneChoices(choices.value),
        randomChoices: cloneRandomChoices(randomChoices.value),
        variables: new Map(blockEntryVariables.value),
        visitedBlocks: new Set(visitedBlocks.value),
        seenOnceSections: new Set(seenOnceSections.value),
      },
    ]
    // Post-current-block state becomes the pre-entry state for the new block.
    blockEntryVariables.value = new Map(storyVariables.value)
    seenOnceSections.value = consumedOnceSections
    visibleOnceSections.value = new Set()
    visitedBlocks.value = new Set([...visitedBlocks.value, title])
    currentBlockTitle.value = title
    currentIndentionLevel.value = 0
    choices.value = {}
    randomChoices.value = {}
    activeBlockStatus.value = "complete_without_continue"
    pendingContinueTarget.value = null
    // A jump always cancels any in-flight detour.
    detourReturnStack.value = []
    resumeFromLine.value = 0
  })
}

/**
 * Record a choice selection and stay within the current block.
 */
export function selectChoice(choiceBlockId: number, choiceLevel: number): void {
  batch(() => {
    choices.value = {
      ...choices.value,
      [choiceBlockId]: choiceLevel,
    }
    currentIndentionLevel.value = currentIndentionLevel.value + 1
    activeBlockStatus.value = "resolving_branch"
    pendingContinueTarget.value = null
  })
}

export function resolveRandomChoices(
  nextRandomChoices: RandomChoiceState,
): void {
  randomChoices.value = cloneRandomChoices(nextRandomChoices)
}

export function updateActiveBlockState(
  status: ActiveBlockStatus,
  continueTarget: string | null,
): void {
  batch(() => {
    activeBlockStatus.value = status
    pendingContinueTarget.value = continueTarget
  })
}

export function continueBranch(): void {
  const target = pendingContinueTarget.value
  if (!target) return
  navigateToBlock(target)
}

/**
 * Enter a detour block. Snapshots the current position (the "first half" of a
 * potentially split block) into history, pushes the return info onto the detour
 * stack, and navigates to the detour target — without clearing the stack (unlike
 * a regular jump).
 */
export function navigateToDetour(
  target: string,
  returnInfo: DetourReturn,
): void {
  batch(() => {
    const consumedOnceSections = new Set([
      ...seenOnceSections.value,
      ...visibleOnceSections.value,
    ])
    // Snapshot everything up to the detour node as one history entry.
    blockHistory.value = [
      ...blockHistory.value,
      {
        title: currentBlockTitle.value,
        startFromLine: resumeFromLine.value,
        choices: cloneChoices(choices.value),
        randomChoices: cloneRandomChoices(randomChoices.value),
        variables: new Map(blockEntryVariables.value),
        visitedBlocks: new Set(visitedBlocks.value),
        seenOnceSections: new Set(seenOnceSections.value),
      },
    ]
    detourReturnStack.value = [...detourReturnStack.value, returnInfo]
    blockEntryVariables.value = new Map(storyVariables.value)
    seenOnceSections.value = consumedOnceSections
    visibleOnceSections.value = new Set()
    visitedBlocks.value = new Set([...visitedBlocks.value, target])
    currentBlockTitle.value = target
    currentIndentionLevel.value = 0
    choices.value = {}
    randomChoices.value = {}
    resumeFromLine.value = 0
    activeBlockStatus.value = "complete_without_continue"
    pendingContinueTarget.value = null
  })
}

/**
 * Return from the current detour to the origin block. Pushes the detour block
 * into history, pops the return stack, and resumes the origin block from the
 * line after the <<detour>> tag.
 */
export function returnFromDetour(): void {
  const stack = detourReturnStack.value
  if (stack.length === 0) return

  const returnInfo = stack[stack.length - 1]

  batch(() => {
    const consumedOnceSections = new Set([
      ...seenOnceSections.value,
      ...visibleOnceSections.value,
    ])
    // Snapshot the detour block into history.
    blockHistory.value = [
      ...blockHistory.value,
      {
        title: currentBlockTitle.value,
        startFromLine: 0,
        choices: cloneChoices(choices.value),
        randomChoices: cloneRandomChoices(randomChoices.value),
        variables: new Map(blockEntryVariables.value),
        visitedBlocks: new Set(visitedBlocks.value),
        seenOnceSections: new Set(seenOnceSections.value),
      },
    ]
    detourReturnStack.value = stack.slice(0, -1)
    // The second half of the origin block continues from the current variable
    // state (which now includes any <<set>> changes made in the detour block).
    blockEntryVariables.value = new Map(storyVariables.value)
    seenOnceSections.value = consumedOnceSections
    visibleOnceSections.value = new Set()
    currentBlockTitle.value = returnInfo.title
    choices.value = cloneChoices(returnInfo.choices)
    randomChoices.value = cloneRandomChoices(returnInfo.randomChoices)
    currentIndentionLevel.value = Object.keys(returnInfo.choices).length
    resumeFromLine.value = returnInfo.line
    activeBlockStatus.value = "resolving_branch"
    pendingContinueTarget.value = null
  })
}

/**
 * Apply a pre-computed map of variable updates atomically.
 * Called by StoryViewer after render to flush <<set>> results without
 * writing to signals during the render pass.
 */
export function applyVariables(
  updates: Map<string, string | number | boolean>,
): void {
  if (updates.size === 0) return
  const merged = new Map(storyVariables.value)
  updates.forEach((v, k) => merged.set(k, v))
  storyVariables.value = merged
}
