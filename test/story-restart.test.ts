import { assertEquals } from "jsr:@std/assert@^1.0.19"

import { shouldShowRestartButton } from "@/islands/StoryViewer.tsx"
import {
  blockHistory,
  choices,
  currentBlockTitle,
  detourReturnStack,
  loadStory,
  storyVariables,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { parseStoryText } from "@/utils/storyParser.ts"

Deno.test("restart button is shown only after the End block completes", () => {
  assertEquals(
    shouldShowRestartButton("End", "complete_without_continue", 0),
    true,
  )
  assertEquals(
    shouldShowRestartButton("Start", "complete_without_continue", 0),
    false,
  )
  assertEquals(shouldShowRestartButton("End", "waiting_for_choice", 0), false)
  assertEquals(
    shouldShowRestartButton("End", "complete_without_continue", 1),
    false,
  )
})

Deno.test("loading a story resets the state for a new run", () => {
  const story = parseStoryText(`<<declare $score = 0>>

title: Start
---
Start text

title: End
---
End text`)

  currentBlockTitle.value = "End"
  choices.value = { "1": 2 }
  storyVariables.value = new Map([["$score", 4]])
  visitedBlocks.value = new Set(["Start", "End"])
  blockHistory.value = [{
    title: "Start",
    startFromLine: 0,
    choices: {},
    randomChoices: {},
    variables: new Map(),
    visitedBlocks: new Set(["Start"]),
    seenOnceSections: new Set(),
  }]
  detourReturnStack.value = [{
    title: "Start",
    line: 1,
    choices: {},
    randomChoices: {},
  }]

  loadStory(story)

  assertEquals(currentBlockTitle.value, "Start")
  assertEquals(choices.value, {})
  assertEquals(Object.fromEntries(storyVariables.value), { "$score": 0 })
  assertEquals([...visitedBlocks.value], ["Start"])
  assertEquals(blockHistory.value, [])
  assertEquals(detourReturnStack.value, [])
})
