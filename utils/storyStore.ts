import { batch, computed, signal } from "@preact/signals"
import { Block, Story } from "@/utils/storyTypes.tsx"

// ===== PERSISTENCE KEYS =====

const KEYS = {
  storyFile: "narrativ_storyFile",
  visitedBlocks: "narrativ_visitedBlocks",
  storyVariables: "narrativ_storyVariables",
  currentBlockTitle: "narrativ_currentBlockTitle",
  currentIndentionLevel: "narrativ_currentIndentionLevel",
  choices: "narrativ_choices",
  isLoggedIn: "narrativ_isLoggedIn",
} as const

// ===== SERIALIZATION HELPERS =====

function isClient(): boolean {
  return typeof localStorage !== "undefined"
}

function serializeSet(set: Set<string>): string {
  return JSON.stringify(Array.from(set))
}

function deserializeSet(json: string): Set<string> {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return new Set<string>(parsed)
  } catch {
    // fall through to default
  }
  return new Set<string>()
}

function serializeMap(
  map: Map<string, string | number | boolean>,
): string {
  return JSON.stringify(Array.from(map.entries()))
}

function deserializeMap(
  json: string,
): Map<string, string | number | boolean> {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) {
      return new Map<string, string | number | boolean>(parsed)
    }
  } catch {
    // fall through to default
  }
  return new Map<string, string | number | boolean>()
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: string): void {
  if (!isClient()) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // quota exceeded or private mode — silently skip
  }
}

function removeStorage(key: string): void {
  if (!isClient()) return
  localStorage.removeItem(key)
}

// ===== SIGNAL INITIALIZATION FROM STORAGE =====

function initVisitedBlocks(): Set<string> {
  if (!isClient()) return new Set<string>()
  const raw = localStorage.getItem(KEYS.visitedBlocks)
  return raw ? deserializeSet(raw) : new Set<string>()
}

function initVariables(): Map<string, string | number | boolean> {
  if (!isClient()) return new Map()
  const raw = localStorage.getItem(KEYS.storyVariables)
  return raw ? deserializeMap(raw) : new Map()
}

// ===== SIGNALS =====

/** The file path of the currently loaded story */
export const storyFile = signal<string>(
  isClient() ? (localStorage.getItem(KEYS.storyFile) ?? "") : "",
)

/**
 * All parsed blocks — NOT persisted.
 * Re-populated from the server-parsed Story on every load via loadStory().
 * StoryViewer uses initialStory.blocks directly for rendering to avoid
 * timing issues; this signal is available for other consumers.
 */
export const storyBlocks = signal<Map<string, Block>>(new Map())

/** Set of block titles the player has visited — persisted */
export const visitedBlocks = signal<Set<string>>(initVisitedBlocks())

/** Game variables declared and mutated during play — persisted */
export const storyVariables = signal<Map<string, string | number | boolean>>(
  initVariables(),
)

/** Title of the block currently being displayed — persisted */
export const currentBlockTitle = signal<string>(
  isClient()
    ? (localStorage.getItem(KEYS.currentBlockTitle) ?? "Start")
    : "Start",
)

/** Current indention level for nested choice visibility — persisted */
export const currentIndentionLevel = signal<number>(
  readStorage<number>(KEYS.currentIndentionLevel, 0),
)

/** Ordered list of choice IDs selected in the current block — persisted */
export const choices = signal<number[]>(
  readStorage<number[]>(KEYS.choices, []),
)

/** Whether the player has passed the login gate — persisted */
export const isLoggedIn = signal<boolean>(
  readStorage<boolean>(KEYS.isLoggedIn, false),
)

/** Derived: the Block object for the current block title */
export const currentBlock = computed<Block | undefined>(() =>
  storyBlocks.value.get(currentBlockTitle.value)
)

// ===== PERSISTENCE =====

/**
 * Write all persisted signals to localStorage.
 * Call this after any state mutation that should survive a page refresh.
 */
export function persistStore(): void {
  if (!isClient()) return
  writeStorage(KEYS.storyFile, JSON.stringify(storyFile.value))
  writeStorage(KEYS.visitedBlocks, serializeSet(visitedBlocks.value))
  writeStorage(KEYS.storyVariables, serializeMap(storyVariables.value))
  writeStorage(
    KEYS.currentBlockTitle,
    JSON.stringify(currentBlockTitle.value),
  )
  writeStorage(
    KEYS.currentIndentionLevel,
    JSON.stringify(currentIndentionLevel.value),
  )
  writeStorage(KEYS.choices, JSON.stringify(choices.value))
  writeStorage(KEYS.isLoggedIn, JSON.stringify(isLoggedIn.value))
}

// ===== STORE ACTIONS =====

/**
 * Populate the store from a freshly server-parsed Story object.
 *
 * - Always loads all blocks (not persisted, always fresh from server).
 * - Restores persisted progress (visitedBlocks, variables, currentBlockTitle,
 *   currentIndentionLevel, choices) if available in localStorage.
 * - If no persisted progress exists, seeds initial variable values from the
 *   parsed story and starts the player at "Start".
 */
export function loadStory(story: Story): void {
  storyFile.value = story.file
  storyBlocks.value = story.blocks

  const hasSavedProgress = isClient() &&
    localStorage.getItem(KEYS.currentBlockTitle) !== null

  if (hasSavedProgress) {
    // Progress already restored from localStorage during signal init.
    // Merge any new variables declared in the yarn file that saved state
    // doesn't have yet (e.g. after a story update adds new variables).
    const merged = new Map(storyVariables.value)
    let changed = false
    story.variables.forEach((value, key) => {
      if (!merged.has(key)) {
        merged.set(key, value)
        changed = true
      }
    })
    if (changed) {
      storyVariables.value = merged
    }
  } else {
    // Fresh start — seed from parsed story defaults.
    // batch() collapses all signal assignments into a single re-render.
    batch(() => {
      visitedBlocks.value = new Set<string>(["Start"])
      storyVariables.value = new Map(story.variables)
      currentBlockTitle.value = "Start"
      currentIndentionLevel.value = 0
      choices.value = []
    })
    persistStore()
  }
}

/**
 * Advance to a new block by title.
 * Marks the block as visited, resets per-block navigation state,
 * and persists. All signal updates are batched into a single re-render.
 */
export function navigateToBlock(title: string): void {
  batch(() => {
    const newVisited = new Set(visitedBlocks.value)
    newVisited.add(title)
    visitedBlocks.value = newVisited
    currentBlockTitle.value = title
    currentIndentionLevel.value = 0
    choices.value = []
  })
  persistStore()
}

/**
 * Handle a choice selection. Combines recording the choice and advancing
 * navigation state into a single batched update with one persistStore call.
 *
 * If jumpTarget is provided, navigates to that block (choice led to a jump).
 * Otherwise, increases the indention level to reveal nested content.
 */
export function selectChoice(
  choiceLevel: number,
  jumpTarget?: string,
): void {
  batch(() => {
    if (jumpTarget) {
      const newVisited = new Set(visitedBlocks.value)
      newVisited.add(jumpTarget)
      visitedBlocks.value = newVisited
      choices.value = [...choices.value, choiceLevel]
      currentIndentionLevel.value = 0
      currentBlockTitle.value = jumpTarget
    } else {
      choices.value = [...choices.value, choiceLevel]
      currentIndentionLevel.value = currentIndentionLevel.value + 1
    }
  })
  persistStore()
}

/**
 * Apply a pre-computed map of variable updates atomically.
 * Used by StoryViewer to flush <<set>> command results after render
 * without writing to the signal during the render pass.
 */
export function applyVariables(
  updates: Map<string, string | number | boolean>,
): void {
  if (updates.size === 0) return
  const merged = new Map(storyVariables.value)
  updates.forEach((v, k) => merged.set(k, v))
  storyVariables.value = merged
  persistStore()
}

/**
 * Update a single story variable after a <<set>> command.
 * Creates a new Map reference to ensure signal reactivity.
 */
export function setVariable(
  key: string,
  value: string | number | boolean,
): void {
  const updated = new Map(storyVariables.value)
  updated.set(key, value)
  storyVariables.value = updated
  persistStore()
}

/**
 * Reset all persisted progress and return to a fresh game state.
 * Blocks are NOT cleared — they are always reloaded from the server.
 * All signal resets are batched into a single re-render.
 */
export function resetProgress(): void {
  Object.values(KEYS).forEach(removeStorage)

  batch(() => {
    visitedBlocks.value = new Set<string>(["Start"])
    storyVariables.value = new Map()
    currentBlockTitle.value = "Start"
    currentIndentionLevel.value = 0
    choices.value = []
    isLoggedIn.value = false
  })
}
