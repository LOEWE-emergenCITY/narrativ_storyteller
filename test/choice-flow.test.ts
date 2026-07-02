import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import {
  evaluateActiveBlockProgress,
  filterVisibleNodes,
} from "@/utils/nodeVisibility.ts"
import { parseStory } from "@/utils/storyParser.ts"
import {
  activeBlockStatus,
  choices,
  continueBranch,
  currentBlockTitle,
  loadStory,
  pendingContinueTarget,
  selectChoice,
  storyVariables,
} from "@/utils/storyStore.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import { TextNode } from "@/utils/storyTypes.tsx"

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
      [],
      context,
    )
    const initialProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      initialVisible.visibleNodes,
      [],
    )

    assertEquals(initialProgress.status, "waiting_for_choice")
    assertEquals(initialProgress.continueTarget, null)

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      [1],
      context,
    )
    const selectedTexts = selectedVisible.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      [1],
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
      [1],
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      [1],
    )

    assertEquals(selectedProgress.status, "auto_jump_now")
    assertEquals(selectedProgress.continueTarget, "Next")

    loadStory(story)
    handleChoiceClick(startBlock.contentNodes, 0)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(choices.value, [])
    assertEquals(storyVariables.value.get("$counter"), 2)
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
      [1],
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      [1],
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
      [1],
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      [1],
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

    selectChoice(1)

    assertEquals(currentBlockTitle.value, "Start")
    assertEquals(choices.value, [1])
    assertEquals(activeBlockStatus.value, "resolving_branch")
    assertEquals(pendingContinueTarget.value, null)

    pendingContinueTarget.value = "Next"
    activeBlockStatus.value = "ready_to_continue"

    continueBranch()

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(choices.value, [])
    assertEquals(pendingContinueTarget.value, null)
    assertEquals(activeBlockStatus.value, "complete_without_continue")
  })
})
