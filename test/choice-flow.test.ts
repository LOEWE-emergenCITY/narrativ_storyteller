import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import {
  evaluateActiveBlockProgress,
  evaluateVisibleNodesSequentially,
  filterVisibleNodes,
} from "@/utils/nodeVisibility.ts"
import { parseStory } from "@/utils/storyParser.ts"
import {
  activeBlockStatus,
  applyVariables,
  blockEntryVariables,
  choices,
  continueBranch,
  currentBlockTitle,
  loadStory,
  pendingContinueTarget,
  selectChoice,
  storyVariables,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import { ActionNode, TextNode } from "@/utils/storyTypes.tsx"

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

Deno.test("choice flow waits for input, then exposes continue after branch settles", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
    <<jump Next>>
-> Second choice
    Other branch
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }

    const initialVisible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )
    const initialProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      initialVisible.visibleNodes,
      {},
    )

    assertEquals(initialProgress.status, "waiting_for_choice")
    assertEquals(initialProgress.continueTarget, null)

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedTexts = selectedVisible.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedTexts, ["Branch line"])
    assertEquals(selectedProgress.status, "ready_to_continue")
    assertEquals(selectedProgress.continueTarget, "Next")
  })
})

Deno.test("choice followed directly by jump auto-navigates", async () => {
  const storyText = `title: Start
---
<<declare $counter = 1>>
-> First choice
    <<set $counter to $counter + 1>>
    <<jump Next>>
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(story.variables),
    }

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedProgress.status, "auto_jump_now")
    assertEquals(selectedProgress.continueTarget, "Next")

    loadStory(story)
    handleChoiceClick(startBlock.contentNodes, 0)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(choices.value, {})
    assertEquals(storyVariables.value.get("$counter"), 2)
  })
})

Deno.test("selected choice inline set updates branch visibility and final variables", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
-> Activate <<set $flag to true>>
    <<if $flag>>
        Branch sees updated flag
    <<endif>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["Branch sees updated flag"])
    assertEquals(result.finalVariables.get("$flag"), true)
  })
})

Deno.test("choice click persists inline set effects within current block", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
-> Activate <<set $flag to true>>
    <<if $flag>>
        Branch sees updated flag
    <<endif>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    loadStory(story)
    handleChoiceClick(startBlock.contentNodes, 0)

    assertEquals(choices.value, { 0: 1 })

    const branchResult = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      choices.value,
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: new Set<string>(),
        variables: blockEntryVariables.value,
      },
    )

    const texts = branchResult.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["Branch sees updated flag"])
  })
})

Deno.test("inline choice if can depend on earlier set nodes in sequence", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<set $flag to true>>
-> Visible choice <<if $flag>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const visibleChoices = result.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(visibleChoices, ["Visible choice"])
  })
})

Deno.test("inline if on text and jump nodes respects sequential variables", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<set $flag to true>>
Visible after set <<if $flag>>
<<jump Next>> <<if $flag>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)
    const jumps = result.visibleNodes
      .filter((node): node is ActionNode => node.type === "jump")
      .map((node) => node.jumpTarget)

    assertEquals(texts, ["Visible after set"])
    assertEquals(jumps, ["Next"])
  })
})

Deno.test("inline if gates set node side effects", async () => {
  const storyText = `title: Start
---
<<declare $enabled = false>>
<<declare $count = 0>>
<<set $count to $count + 1>> <<if $enabled>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    assertEquals(result.finalVariables.get("$count"), 0)
  })
})

Deno.test("nested unresolved choice blocks continue", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
    -> Nested choice
        Nested result
        <<jump Next>>
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedProgress.status, "waiting_for_choice")
    assertEquals(selectedProgress.continueTarget, null)
  })
})

Deno.test("selected branch without jump completes in place", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedProgress.status, "complete_without_continue")
    assertEquals(selectedProgress.continueTarget, null)
  })
})

Deno.test("store selection does not navigate, continue executes armed jump", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
    <<jump Next>>
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)

    assertEquals(currentBlockTitle.value, "Start")

    selectChoice(0, 1)

    assertEquals(currentBlockTitle.value, "Start")
    assertEquals(choices.value, { 0: 1 })
    assertEquals(activeBlockStatus.value, "resolving_branch")
    assertEquals(pendingContinueTarget.value, null)

    pendingContinueTarget.value = "Next"
    activeBlockStatus.value = "ready_to_continue"

    continueBranch()

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(choices.value, {})
    assertEquals(pendingContinueTarget.value, null)
    assertEquals(activeBlockStatus.value, "complete_without_continue")
  })
})

Deno.test("self-mutating else branch does not re-open earlier if, but later if sees updated value", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<if $flag>>
    First if true
<<else>>
    First else false
    <<set $flag to true>>
<<endif>>
<<if $flag>>
    Second if true
<<endif>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(story.variables),
    }

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      context,
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["First else false", "Second if true"])
    assertEquals(result.finalVariables.get("$flag"), true)
    assert(!texts.includes("First if true"))
  })
})

Deno.test("re-entered block re-evaluates first if from updated variable state", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<if $flag>>
    First if true
<<else>>
    First else false
    <<set $flag to true>>
<<endif>>
<<jump Next>>
===
title: Next
---
<<jump Start>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)

    const startBlock = story.blocks.get("Start")
    assert(startBlock)

    const firstPass = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: new Set<string>(),
        variables: blockEntryVariables.value,
      },
    )

    applyVariables(firstPass.finalVariables)

    const reentryContext = {
      visitedBlocks: new Set(["Start", "Next"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(storyVariables.value),
    }

    const reentered = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      reentryContext,
    )

    const texts = reentered.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["First if true"])
  })
})
