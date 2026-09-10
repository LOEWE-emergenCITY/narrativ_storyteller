import { useEffect, useState } from "preact/hooks"
import { TitleScreen } from "@/components/TitleScreen.tsx"
import StoryViewer from "@/islands/StoryViewer.tsx"
import {
  activeBlockStatus,
  blockEntryVariables,
  blockHistory,
  choices,
  currentBlockTitle,
  currentIndentionLevel,
  getSavedStoryState,
  isSavedStoryState,
  loadScienceFacts,
  loadStory,
  pendingContinueTarget,
  restoreSavedStoryState,
  seenOnceSections,
  STORY_STATE_STORAGE_KEY,
  storyVariables,
  visibleOnceSections,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { Story } from "@/utils/storyTypes.tsx"

type StoryAppProps = {
  story: Story
  scienceFacts: Record<string, string>
}

export function shouldPersistStoryState(
  startupResolved: boolean,
  hasStarted: boolean,
): boolean {
  return startupResolved && hasStarted
}

function StoryApp({ story, scienceFacts }: StoryAppProps) {
  const [startupResolved, setStartupResolved] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hasSavedState, setHasSavedState] = useState(false)

  function readSavedState() {
    const savedStateJson = globalThis.localStorage?.getItem(
      STORY_STATE_STORAGE_KEY,
    )

    if (!savedStateJson) return null

    try {
      const parsedState = JSON.parse(savedStateJson)

      if (
        isSavedStoryState(parsedState) &&
        parsedState.storyFile === story.file &&
        parsedState.storyVersion === story.version
      ) {
        return parsedState
      }
    } catch {
      // Ignore malformed localStorage payloads and fall back to a fresh start.
    }

    globalThis.localStorage?.removeItem(STORY_STATE_STORAGE_KEY)
    return null
  }

  useEffect(() => {
    setStartupResolved(false)

    const savedState = readSavedState()

    loadStory(story)
    loadScienceFacts(scienceFacts)

    setHasSavedState(savedState !== null)
    setHasStarted(false)
    setStartupResolved(true)
  }, [story, scienceFacts])

  function handleStart() {
    globalThis.localStorage?.removeItem(STORY_STATE_STORAGE_KEY)
    loadStory(story)
    setHasSavedState(false)
    setHasStarted(true)
  }

  function handleContinue() {
    const savedState = readSavedState()
    if (!savedState) {
      setHasSavedState(false)
      return
    }

    restoreSavedStoryState(savedState)
    setHasSavedState(true)
    setHasStarted(true)
  }

  useEffect(() => {
    if (!shouldPersistStoryState(startupResolved, hasStarted)) return

    if (story.version === null) return

    const savedState = getSavedStoryState(
      story.file,
      story.version,
      hasStarted,
    )
    globalThis.localStorage?.setItem(
      STORY_STATE_STORAGE_KEY,
      JSON.stringify(savedState, null, 2),
    )
  }, [
    startupResolved,
    hasStarted,
    currentBlockTitle.value,
    currentIndentionLevel.value,
    choices.value,
    storyVariables.value,
    visitedBlocks.value,
    seenOnceSections.value,
    visibleOnceSections.value,
    blockEntryVariables.value,
    activeBlockStatus.value,
    pendingContinueTarget.value,
    blockHistory.value,
    story.file,
    story.version,
  ])

  if (!hasStarted) {
    return (
      <TitleScreen
        isReady={startupResolved}
        canContinue={hasSavedState}
        onStart={handleStart}
        onContinue={handleContinue}
      />
    )
  }

  return <StoryViewer />
}

export default StoryApp
