import { batch, computed, signal } from "@preact/signals"
import { Block, Story } from "@/utils/storyTypes.tsx"

// ===== SIGNALS =====

export const storyFile = signal<string>("")
export const storyBlocks = signal<Map<string, Block>>(new Map())
export const visitedBlocks = signal<Set<string>>(new Set())
export const storyVariables = signal<Map<string, string | number | boolean>>(
  new Map(),
)
export const currentBlockTitle = signal<string>("Start")
export const currentIndentionLevel = signal<number>(0)
export const choices = signal<number[]>([])
export const isLoggedIn = signal<boolean>(false)

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
    visitedBlocks.value = new Set(["Start"])
    currentBlockTitle.value = "Start"
    currentIndentionLevel.value = 0
    choices.value = []
  })
}

/**
 * Advance to a new block, mark it visited, and reset per-block navigation.
 */
export function navigateToBlock(title: string): void {
  batch(() => {
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
 */
export function selectChoice(
  choiceLevel: number,
  jumpTarget?: string,
): void {
  batch(() => {
    if (jumpTarget) {
      visitedBlocks.value = new Set([...visitedBlocks.value, jumpTarget])
      choices.value = [...choices.value, choiceLevel]
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
    storyVariables.value = new Map()
    visitedBlocks.value = new Set()
    currentBlockTitle.value = "Start"
    currentIndentionLevel.value = 0
    choices.value = []
    isLoggedIn.value = false
  })
}
