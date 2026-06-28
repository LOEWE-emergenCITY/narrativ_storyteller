import { batch, computed, signal } from "@preact/signals"
import { Block, Story } from "@/utils/storyTypes.tsx"

// ===== SIGNALS =====

export const storyFile = signal<string>("")
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
export const choices = signal<number[]>([])
export const isLoggedIn = signal<boolean>(false)

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
 */
export const blockHistory = signal<
  Array<{
    title: string
    choices: number[]
    variables: Map<string, string | number | boolean>
    visitedBlocks: Set<string>
    seenOnceSections: Set<string>
  }>
>([])

export const currentBlock = computed<Block | undefined>(() =>
  storyBlocks.value.get(currentBlockTitle.value)
)

// ===== ACTIONS =====

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

  batch(() => {
    storyFile.value = story.file
    storyBlocks.value = blocks
    storyVariables.value = variables
    blockEntryVariables.value = new Map(variables)
    visitedBlocks.value = new Set(["Start"])
    seenOnceSections.value = new Set()
    visibleOnceSections.value = new Set()
    currentBlockTitle.value = "Start"
    currentIndentionLevel.value = 0
    choices.value = []
    blockHistory.value = []
  })
}

export function loadScienceFacts(facts: Record<string, string>): void {
  scienceFacts.value = { ...facts }
}

/**
 * Advance to a new block, mark it visited, and reset per-block navigation.
 * Snapshots the leaving block into blockHistory so it can be rendered
 * read-only as part of the accumulated story view.
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
        choices: choices.value,
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
    choices.value = []
  })
}

/**
 * Record a choice and advance navigation in one batched update.
 * Jumps to jumpTarget block when the choice is immediately followed by a jump,
 * otherwise opens the nested indention level.
 * When navigating away, snapshots the leaving block (with the final choices
 * that include the just-made selection) into blockHistory.
 */
export function selectChoice(
  choiceLevel: number,
  jumpTarget?: string,
): void {
  batch(() => {
    if (jumpTarget) {
      const finalChoices = [...choices.value, choiceLevel]
      const consumedOnceSections = new Set([
        ...seenOnceSections.value,
        ...visibleOnceSections.value,
      ])
      blockHistory.value = [
        ...blockHistory.value,
        {
          title: currentBlockTitle.value,
          choices: finalChoices,
          variables: new Map(blockEntryVariables.value),
          visitedBlocks: new Set(visitedBlocks.value),
          seenOnceSections: new Set(seenOnceSections.value),
        },
      ]
      // Post-current-block state becomes the pre-entry state for the new block.
      blockEntryVariables.value = new Map(storyVariables.value)
      seenOnceSections.value = consumedOnceSections
      visibleOnceSections.value = new Set()
      visitedBlocks.value = new Set([...visitedBlocks.value, jumpTarget])
      choices.value = []
      currentIndentionLevel.value = 0
      currentBlockTitle.value = jumpTarget
    } else {
      choices.value = [...choices.value, choiceLevel]
      currentIndentionLevel.value = currentIndentionLevel.value + 1
    }
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

/**
 * Reset all game state back to the initial defaults.
 */
export function resetGame(): void {
  batch(() => {
    storyBlocks.value = new Map()
    scienceFacts.value = {}
    storyVariables.value = new Map()
    blockEntryVariables.value = new Map()
    visitedBlocks.value = new Set()
    seenOnceSections.value = new Set()
    visibleOnceSections.value = new Set()
    blockHistory.value = []
    currentBlockTitle.value = "Start"
    currentIndentionLevel.value = 0
    choices.value = []
    isLoggedIn.value = false
  })
}
