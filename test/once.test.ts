import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import { filterVisibleNodes } from "@/utils/nodeVisibility.ts"
import { parseStory } from "@/utils/storyParser.ts"
import { ActionNode, ConditionNode, TextNode } from "@/utils/storyTypes.tsx"

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

    const firstPass = filterVisibleNodes(startBlock.contentNodes, [], {
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

    const revisit = filterVisibleNodes(startBlock.contentNodes, [], {
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
