import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import {
  activeBlockStatus,
  applyVariables,
  blockEntryVariables,
  blockHistory,
  choices,
  currentBlockTitle,
  currentIndentionLevel,
  getSavedStoryState,
  isSavedStoryState,
  loadStory,
  navigateToBlock,
  pendingContinueTarget,
  restoreSavedStoryState,
  seenOnceSections,
  STORY_STATE_VERSION,
  storyVariables,
  updateActiveBlockState,
  visibleOnceSections,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { parseStory } from "@/utils/storyParser.ts"

async function withTempStory(
  contents: string,
  run: (path: string) => Promise<void>,
): Promise<void> {
  const tempFile = await Deno.makeTempFile({ suffix: ".yarn" })

  try {
    await Deno.writeTextFile(tempFile, contents)
    await run(tempFile)
  } finally {
    await Deno.remove(tempFile)
  }
}

Deno.test("saved story state is valid and restores exact runtime state", async () => {
  const storyText = `title: Start
---
<<declare $trust = 0>>
-> Go left
    <<set $trust to $trust + 1>>
    <<jump Next>>
===
title: Next
---
Next block
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)
    choices.value = [1]
    currentIndentionLevel.value = 1
    applyVariables(new Map([["$trust", 1]]))
    visibleOnceSections.value = new Set(["Next:1"])
    seenOnceSections.value = new Set(["Start:3"])
    updateActiveBlockState("ready_to_continue", "Next")
    navigateToBlock("Next")
    choices.value = [2]
    currentIndentionLevel.value = 1
    visibleOnceSections.value = new Set(["Next:5"])
    updateActiveBlockState("waiting_for_choice", null)

    const savedState = getSavedStoryState(story.file, true)

    assert(isSavedStoryState(savedState))
    assertEquals(savedState.version, STORY_STATE_VERSION)

    loadStory(story)
    restoreSavedStoryState(savedState)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(currentIndentionLevel.value, 1)
    assertEquals(choices.value, [2])
    assertEquals(Object.fromEntries(storyVariables.value), { "$trust": 1 })
    assertEquals([...visitedBlocks.value], ["Start", "Next"])
    assertEquals([...seenOnceSections.value], ["Start:3", "Next:1"])
    assertEquals([...visibleOnceSections.value], ["Next:5"])
    assertEquals(Object.fromEntries(blockEntryVariables.value), { "$trust": 1 })
    assertEquals(activeBlockStatus.value, "waiting_for_choice")
    assertEquals(pendingContinueTarget.value, null)
    assertEquals(blockHistory.value.length, 1)
    assertEquals(blockHistory.value[0].title, "Start")
    assertEquals(blockHistory.value[0].choices, [1])
    assertEquals(Object.fromEntries(blockHistory.value[0].variables), {
      "$trust": 0,
    })
    assertEquals([...blockHistory.value[0].visitedBlocks], ["Start"])
    assertEquals([...blockHistory.value[0].seenOnceSections], ["Start:3"])
  })
})

Deno.test("saved story state validator rejects malformed payloads", () => {
  assertEquals(isSavedStoryState(null), false)
  assertEquals(isSavedStoryState({ version: STORY_STATE_VERSION }), false)
  assertEquals(
    isSavedStoryState({
      version: STORY_STATE_VERSION,
      storyFile: "demo.yarn",
      hasStarted: true,
      currentBlockTitle: "Start",
      currentIndentionLevel: 0,
      choices: [],
      storyVariables: {},
      visitedBlocks: [],
      seenOnceSections: [],
      visibleOnceSections: [],
      blockEntryVariables: {},
      activeBlockStatus: "not_valid",
      pendingContinueTarget: null,
      blockHistory: [],
    }),
    false,
  )
})
