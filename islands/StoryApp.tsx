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

function StoryApp({ story, scienceFacts }: StoryAppProps) {
  const [dataLoaded, setDataLoaded] = useState(false)
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
        isSavedStoryState(parsedState) && parsedState.storyFile === story.file
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
    loadStory(story)
    loadScienceFacts(scienceFacts)

    setHasSavedState(readSavedState() !== null)
    setHasStarted(false)

    setDataLoaded(true)
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
    if (!dataLoaded) return

    const savedState = getSavedStoryState(story.file, hasStarted)
    globalThis.localStorage?.setItem(
      STORY_STATE_STORAGE_KEY,
      JSON.stringify(savedState, null, 2),
    )
  }, [
    dataLoaded,
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
  ])

  if (!hasStarted) {
    return (
      <TitleScreen
        canContinue={hasSavedState}
        onStart={handleStart}
        onContinue={handleContinue}
      />
    )
  }

  return <StoryViewer />
}

export default StoryApp
