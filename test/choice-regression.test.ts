import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import { filterVisibleNodes } from "@/utils/nodeVisibility.ts"
import { parseStory } from "@/utils/storyParser.ts"
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

Deno.test("parser assigns distinct levels to sibling top-level choices", async () => {
  const storyText = `title: Start
---
-> First choice
    First branch
-> Second choice
    Second branch
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const choiceNodes = startBlock.contentNodes.filter((node): node is ActionNode =>
      node.type === "choice"
    )

    assertEquals(choiceNodes.length, 2)
    assertEquals(choiceNodes[0].myChoiceLevel, 1)
    assertEquals(choiceNodes[1].myChoiceLevel, 2)
    assertEquals([...choiceNodes[0].choicePath], [])
    assertEquals([...choiceNodes[1].choicePath], [])
  })
})

Deno.test("parser keeps sibling numbering after dedenting within a branch", async () => {
  const storyText = `title: Start
---
-> First choice
    <<if true>>
        Inner line
    <<endif>>
-> Second choice
    Second branch
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const choiceNodes = startBlock.contentNodes.filter((node): node is ActionNode =>
      node.type === "choice"
    )

    assertEquals(choiceNodes.length, 2)
    assertEquals(choiceNodes[0].myChoiceLevel, 1)
    assertEquals(choiceNodes[1].myChoiceLevel, 2)
  })
})

Deno.test("nested choices render only for the selected parent branch", async () => {
  const storyText = `title: Start
---
-> First choice
    -> Nested first
        Nested first result
-> Second choice
    Second branch result
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

    const initialVisible = filterVisibleNodes(startBlock.contentNodes, [], context)
    const initialChoiceTexts = initialVisible.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(initialChoiceTexts, ["First choice", "Second choice"])

    const firstBranchVisible = filterVisibleNodes(
      startBlock.contentNodes,
      [1],
      context,
    )
    const firstBranchChoiceTexts = firstBranchVisible.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)
    const firstBranchTexts = firstBranchVisible.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(firstBranchChoiceTexts, ["First choice", "Nested first"])
    assertEquals(firstBranchTexts, [])

    const secondBranchVisible = filterVisibleNodes(
      startBlock.contentNodes,
      [2],
      context,
    )
    const secondBranchChoiceTexts = secondBranchVisible.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)
    const secondBranchTexts = secondBranchVisible.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(secondBranchChoiceTexts, ["Second choice"])
    assertEquals(secondBranchTexts, ["Second branch result"])
  })
})
