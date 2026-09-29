import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import {
  activeBlockStatus,
  activeRenderSnapshot,
  applyVariables,
  blockEntryVariables,
  blockHistory,
  choices,
  currentBlockTitle,
  currentIndentionLevel,
  detourReturnStack,
  getSavedStoryState,
  isSavedStoryState,
  loadStory,
  navigateToBlock,
  pendingContinueTarget,
  randomChoices,
  resolveRandomChoices,
  restoreSavedStoryState,
  resumeFromLine,
  seenOnceSections,
  STORY_STATE_VERSION,
  storyVariables,
  updateActiveBlockState,
  updateActiveRenderSnapshot,
  visibleOnceSections,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import {
  parseTestStory as parseStory,
  withTestStory as withTempStory,
} from "@/test/helpers.ts"

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
    choices.value = { 0: 1 }
    resolveRandomChoices({ 0: 2 })
    currentIndentionLevel.value = 1
    applyVariables(new Map([["$trust", 1]]))
    visibleOnceSections.value = new Set(["Next:1"])
    seenOnceSections.value = new Set(["Start:3"])
    updateActiveRenderSnapshot({
      visibleNodes: [{ index: 0, variables: { "$trust": 0 } }],
      visibleOnceKeys: ["Start:3"],
    })
    updateActiveBlockState("ready_to_continue", "Next")
    navigateToBlock("Next")
    choices.value = { 0: 2 }
    resolveRandomChoices({ 0: 1 })
    currentIndentionLevel.value = 1
    visibleOnceSections.value = new Set(["Next:5"])
    detourReturnStack.value = [{
      title: "Start",
      line: 4,
      choices: { 0: 1 },
      randomChoices: { 0: 2 },
    }]
    resumeFromLine.value = 2
    updateActiveBlockState("waiting_for_choice", null)

    const savedState = getSavedStoryState(story.file, 1, true)

    assert(isSavedStoryState(savedState))
    assertEquals(savedState.version, STORY_STATE_VERSION)

    loadStory(story)
    restoreSavedStoryState(savedState)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(currentIndentionLevel.value, 1)
    assertEquals(choices.value, { 0: 2 })
    assertEquals(randomChoices.value, { 0: 1 })
    assertEquals(Object.fromEntries(storyVariables.value), { "$trust": 1 })
    assertEquals([...visitedBlocks.value], ["Start", "Next"])
    assertEquals([...seenOnceSections.value], ["Start:3", "Next:1"])
    assertEquals([...visibleOnceSections.value], ["Next:5"])
    assertEquals(Object.fromEntries(blockEntryVariables.value), { "$trust": 1 })
    assertEquals(activeBlockStatus.value, "waiting_for_choice")
    assertEquals(pendingContinueTarget.value, null)
    assertEquals(detourReturnStack.value, [{
      title: "Start",
      line: 4,
      choices: { 0: 1 },
      randomChoices: { 0: 2 },
    }])
    assertEquals(resumeFromLine.value, 2)
    assertEquals(blockHistory.value.length, 1)
    assertEquals(blockHistory.value[0].title, "Start")
    assertEquals(blockHistory.value[0].choices, { 0: 1 })
    assertEquals(blockHistory.value[0].randomChoices, { 0: 2 })
    assertEquals(blockHistory.value[0].renderSnapshot, {
      visibleNodes: [{ index: 0, variables: { "$trust": 0 } }],
      visibleOnceKeys: ["Start:3"],
    })
    assertEquals(Object.fromEntries(blockHistory.value[0].variables), {
      "$trust": 0,
    })
    assertEquals([...blockHistory.value[0].visitedBlocks], ["Start"])
    assertEquals([...blockHistory.value[0].seenOnceSections], ["Start:3"])
    assertEquals(activeRenderSnapshot.value, null)
  })
})

Deno.test("saved story state includes the story content version", () => {
  const savedState = getSavedStoryState("demo.yarn", 25, true)

  assertEquals(savedState.storyVersion, 25)
  assertEquals(isSavedStoryState({ ...savedState, storyVersion: 26 }), true)
})

Deno.test("active render snapshot survives save and restore", async () => {
  const story = await parseStory(`title: Start
---
<<declare $counter = 0>>
<<set $counter to $counter + 1>>
Visible once <<once>>
===
`)

  loadStory(story)
  applyVariables(new Map([["$counter", 1]]))
  updateActiveRenderSnapshot({
    visibleNodes: [{ index: 1, variables: { "$counter": 1 } }],
    visibleOnceKeys: ["Start:4"],
  })

  const savedState = getSavedStoryState(story.file, 1, true)

  loadStory(story)
  restoreSavedStoryState(savedState)

  assertEquals(storyVariables.value.get("$counter"), 1)
  assertEquals(activeRenderSnapshot.value, {
    visibleNodes: [{ index: 1, variables: { "$counter": 1 } }],
    visibleOnceKeys: ["Start:4"],
  })
})

Deno.test("plan variables remain true across save and reload", async () => {
  const story = await parseStory(`title: Start
---
<<declare $SpielerHasOwnEHUBPlan = false>>
<<declare $digitaleHUBPlan = false>>
<<declare $SpielerHasThilosEHUBPlan = false>>
<<declare $SpielerAuftrageHUBPlaeneVergleichen = false>>
Start
===
`)

  loadStory(story)
  applyVariables(
    new Map([
      ["$SpielerHasOwnEHUBPlan", true],
      ["$digitaleHUBPlan", true],
      ["$SpielerHasThilosEHUBPlan", true],
      ["$SpielerAuftrageHUBPlaeneVergleichen", true],
    ]),
  )

  const savedState = getSavedStoryState(story.file, 1, true)

  loadStory(story)
  restoreSavedStoryState(savedState)

  assertEquals(Object.fromEntries(storyVariables.value), {
    "$SpielerHasOwnEHUBPlan": true,
    "$digitaleHUBPlan": true,
    "$SpielerHasThilosEHUBPlan": true,
    "$SpielerAuftrageHUBPlaeneVergleichen": true,
  })
})

function validSavedStoryState() {
  return {
    version: STORY_STATE_VERSION,
    storyFile: "demo.yarn",
    storyVersion: 1,
    hasStarted: true,
    currentBlockTitle: "Start",
    currentIndentionLevel: 0,
    choices: {},
    randomChoices: {},
    storyVariables: {},
    visitedBlocks: [],
    seenOnceSections: [],
    visibleOnceSections: [],
    blockEntryVariables: {},
    activeBlockStatus: "complete_without_continue",
    pendingContinueTarget: null,
    blockHistory: [],
    detourReturnStack: [],
    resumeFromLine: 0,
  }
}

Deno.test("navigation stores active render snapshot without re-evaluating visibility", async () => {
  const storyText = `title: Start
---
<<declare $checkEHUBLog = 3>>
Angela checks the logs.
<<set $checkEHUBLog to $checkEHUBLog - 4>>
Finished branch <<if $checkEHUBLog <= 0>>
<<jump Pause>>
===
title: Pause
---
Pause
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const introIndex = startBlock.contentNodes.findIndex((node) =>
      node.type === "text" && node.text === "Angela checks the logs."
    )
    const finishedIndex = startBlock.contentNodes.findIndex((node) =>
      node.type === "text" && node.text === "Finished branch"
    )
    const jumpIndex = startBlock.contentNodes.findIndex((node) =>
      node.type === "jump"
    )

    loadStory(story)
    applyVariables(new Map([["$checkEHUBLog", -1]]))
    updateActiveRenderSnapshot({
      visibleNodes: [
        { index: introIndex, variables: { "$checkEHUBLog": 3 } },
        { index: finishedIndex, variables: { "$checkEHUBLog": -1 } },
        { index: jumpIndex, variables: { "$checkEHUBLog": -1 } },
      ],
      visibleOnceKeys: [],
    })
    updateActiveBlockState("ready_to_continue", "Pause")
    navigateToBlock("Pause")

    assertEquals(blockHistory.value.length, 1)
    assertEquals(blockHistory.value[0].renderSnapshot, {
      visibleNodes: [
        { index: introIndex, variables: { "$checkEHUBLog": 3 } },
        { index: finishedIndex, variables: { "$checkEHUBLog": -1 } },
        { index: jumpIndex, variables: { "$checkEHUBLog": -1 } },
      ],
      visibleOnceKeys: [],
    })
  })
})

Deno.test("saved story state validator rejects malformed payloads", () => {
  assertEquals(isSavedStoryState(null), false)
  assertEquals(isSavedStoryState({ version: STORY_STATE_VERSION }), false)
  assertEquals(
    isSavedStoryState({
      version: STORY_STATE_VERSION,
      storyFile: "demo.yarn",
      storyVersion: 1,
      hasStarted: true,
      currentBlockTitle: "Start",
      currentIndentionLevel: 0,
      choices: {},
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
  assertEquals(
    isSavedStoryState({ ...validSavedStoryState(), randomChoices: { 0: "x" } }),
    false,
  )
  assertEquals(
    isSavedStoryState({
      ...validSavedStoryState(),
      blockHistory: [{
        title: "Start",
        startFromLine: 0,
        choices: {},
        randomChoices: { 0: "x" },
        variables: {},
        visitedBlocks: [],
        seenOnceSections: [],
      }],
    }),
    false,
  )
  assertEquals(
    isSavedStoryState({
      ...validSavedStoryState(),
      blockHistory: [{
        title: "Start",
        startFromLine: 0,
        choices: {},
        variables: {},
        visitedBlocks: [],
        seenOnceSections: [],
        renderSnapshot: {
          visibleNodes: [{ index: "0", variables: {} }],
          visibleOnceKeys: [],
        },
      }],
    }),
    false,
  )
  assertEquals(
    isSavedStoryState({ ...validSavedStoryState(), resumeFromLine: "0" }),
    false,
  )
  assertEquals(
    isSavedStoryState({
      ...validSavedStoryState(),
      detourReturnStack: [{ title: "Start", line: "1", choices: {} }],
    }),
    false,
  )
})
