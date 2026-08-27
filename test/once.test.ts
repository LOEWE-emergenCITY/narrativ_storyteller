import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import { filterVisibleNodes } from "@/utils/nodeVisibility.ts"
import {
  blockEntryVariables,
  currentBlockTitle,
  loadStory,
  storyVariables,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { ActionNode, ConditionNode, TextNode } from "@/utils/storyTypes.tsx"
import {
  parseTestStory as parseStory,
  withTestStory as withTempStory,
} from "@/test/helpers.ts"

Deno.test("parseStory attaches once keys to inline and block once nodes", async () => {
  const storyText = `title: Start
---
Hello there <<once>>
<<jump Next>> <<once>>
<<once>>
    Only once block
<<endonce>>
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

    const [inlineText, inlineJump, onceNode, blockText] =
      startBlock.contentNodes

    assertEquals((inlineText as TextNode).type, "text")
    assertEquals((inlineText as TextNode).text, "Hello there")
    assert((inlineText as TextNode).onceKey)

    assertEquals((inlineJump as ActionNode).type, "jump")
    assertEquals((inlineJump as ActionNode).jumpTarget, "Next")
    assert((inlineJump as ActionNode).onceKey)

    assertEquals((onceNode as ConditionNode).type, "once")
    assert((onceNode as ConditionNode).onceKey)

    assertEquals((blockText as TextNode).type, "text")
    assertEquals((blockText as TextNode).text, "Only once block")
  })
})

Deno.test("inline if and inline once can coexist on a text line", async () => {
  const storyText = `title: Start
---
Only once when enabled <<if $flag>> <<once>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const textNode = startBlock.contentNodes[0] as TextNode

    assertEquals(textNode.type, "text")
    assertEquals(textNode.text, "Only once when enabled")
    assertEquals(textNode.condition, "$flag")
    assert(textNode.onceKey)
  })
})

Deno.test("filterVisibleNodes hides once content after revisit", async () => {
  const storyText = `title: Start
---
Always visible
Inline once text <<once>>
<<once>>
    Block once text
<<endonce>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const firstPass = filterVisibleNodes(startBlock.contentNodes, {}, {}, {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set(),
      variables: new Map(),
    })

    const firstTexts = firstPass.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(firstTexts, [
      "Always visible",
      "Inline once text",
      "Block once text",
    ])
    assertEquals(firstPass.visibleOnceKeys.size, 2)

    const revisit = filterVisibleNodes(startBlock.contentNodes, {}, {}, {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: firstPass.visibleOnceKeys,
      variables: new Map(),
    })

    const revisitTexts = revisit.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(revisitTexts, ["Always visible"])
    assertEquals(revisit.visibleOnceKeys.size, 0)
  })
})

Deno.test("inline once on choice hides the choice after revisit", async () => {
  const storyText = `title: Start
---
-> Only once <<once>>
-> Always there
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const firstPass = filterVisibleNodes(startBlock.contentNodes, {}, {}, {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(),
    })

    const firstChoices = firstPass.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(firstChoices, ["Only once", "Always there"])

    const revisit = filterVisibleNodes(startBlock.contentNodes, {}, {}, {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: firstPass.visibleOnceKeys,
      variables: new Map(),
    })

    const revisitChoices = revisit.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(revisitChoices, ["Always there"])
  })
})

Deno.test("loadStory skips bootstrap Start block and applies startup sets", async () => {
  const storyText = `title: Start
---
<<declare $counter = 1>>
<<set $counter to $counter + 2>>
<<jump Next>>
===
title: Next
---
Ready
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(storyVariables.value.get("$counter"), 3)
    assertEquals(blockEntryVariables.value.get("$counter"), 3)
    assertEquals(Array.from(visitedBlocks.value), ["Start", "Next"])
  })
})
