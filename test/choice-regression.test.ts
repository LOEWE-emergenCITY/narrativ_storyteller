import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import { filterVisibleNodes } from "@/utils/nodeVisibility.ts"
import { parseStory } from "@/utils/storyParser.ts"
import { ActionNode, CommandNode, TextNode } from "@/utils/storyTypes.tsx"

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

    const choiceNodes = startBlock.contentNodes.filter((
      node,
    ): node is ActionNode => node.type === "choice")

    assertEquals(choiceNodes.length, 2)
    assertEquals(choiceNodes[0].myChoiceLevel, 1)
    assertEquals(choiceNodes[1].myChoiceLevel, 2)
    assertEquals([...choiceNodes[0].choicePath], [])
    assertEquals([...choiceNodes[1].choicePath], [])
  })
})

Deno.test("parser captures inline choice if once and set metadata", async () => {
  const storyText = `title: Start
---
-> Angela ignoriert die Nachricht <<if $AngelasPosition == "Laptop">> <<once>> <<set $flag to true>> <<set $counter to $counter + 1>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const choiceNode = startBlock.contentNodes[0] as ActionNode

    assertEquals(choiceNode.type, "choice")
    assertEquals(choiceNode.text, "Angela ignoriert die Nachricht")
    assertEquals(choiceNode.condition, '$AngelasPosition == "Laptop"')
    assert(choiceNode.onceKey)
    assertEquals(choiceNode.inlineSetCommands, [
      "$flag to true",
      "$counter to $counter + 1",
    ])
  })
})

Deno.test("parser strips inline choice tags when conditions contain comparison operators", async () => {
  const storyText = `title: Start
---
-> Visible when score is high <<if $score >= 3>> <<set $seen to true>> <<once>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const choiceNode = startBlock.contentNodes[0] as ActionNode

    assertEquals(choiceNode.text, "Visible when score is high")
    assertEquals(choiceNode.condition, "$score >= 3")
    assertEquals(choiceNode.inlineSetCommands, ["$seen to true"])
    assert(choiceNode.onceKey)
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

    const choiceNodes = startBlock.contentNodes.filter((
      node,
    ): node is ActionNode => node.type === "choice")

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

    const initialVisible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )
    const initialChoiceTexts = initialVisible.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(initialChoiceTexts, ["First choice", "Second choice"])

    const firstBranchVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
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
      { 0: 2 },
      {},
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

Deno.test("inline choice if hides and shows sibling choices based on variables", async () => {
  const storyText = `title: Start
---
<<declare $AngelasPosition = "Laptop">>
-> Laptop only <<if $AngelasPosition == "Laptop">>
-> Couch only <<if $AngelasPosition == "Couch">>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const visible = filterVisibleNodes(startBlock.contentNodes, {}, {}, {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(story.variables),
    })

    const visibleChoices = visible.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(visibleChoices, ["Laptop only"])
  })
})

Deno.test("choice numbering remains stable with inline choice suffixes", async () => {
  const storyText = `title: Start
---
-> First choice <<if true>> <<set $flag to true>>
    First branch
-> Second choice <<once>>
    Second branch
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const choiceNodes = startBlock.contentNodes.filter((
      node,
    ): node is ActionNode => node.type === "choice")

    assertEquals(choiceNodes.length, 2)
    assertEquals(choiceNodes[0].myChoiceLevel, 1)
    assertEquals(choiceNodes[1].myChoiceLevel, 2)
  })
})

Deno.test("separate same-indent choice blocks resolve one after another", async () => {
  const storyText = `title: Start
---
-> First A
    First A result
-> First B
    First B result
Between groups
-> Second A
    Second A result
-> Second B
    Second B result
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

    const initial = filterVisibleNodes(startBlock.contentNodes, {}, {}, context)
    const initialChoices = initial.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)
    const initialTexts = initial.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(initialChoices, ["First A", "First B"])
    assertEquals(initialTexts, [])

    const afterFirst = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const afterFirstChoices = afterFirst.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)
    const afterFirstTexts = afterFirst.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(afterFirstChoices, ["First A", "Second A", "Second B"])
    assertEquals(afterFirstTexts, ["First A result", "Between groups"])

    const afterSecond = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1, 1: 2 },
      {},
      context,
    )
    const afterSecondChoices = afterSecond.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)
    const afterSecondTexts = afterSecond.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(afterSecondChoices, ["First A", "Second B"])
    assertEquals(afterSecondTexts, [
      "First A result",
      "Between groups",
      "Second B result",
    ])
  })
})

Deno.test("parser captures inline if metadata on text chat and command nodes", async () => {
  const storyText = `title: Start
---
Narration line <<if $flag>>
Angela: Hallo <<if visited(Intro)>>
<<jump Next>> <<if $ready>>
<<set $seen to true>> <<if $flag>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const [textNode, chatNode, jumpNode, setNode] = startBlock.contentNodes

    assertEquals((textNode as TextNode).type, "text")
    assertEquals((textNode as TextNode).text, "Narration line")
    assertEquals((textNode as TextNode).condition, "$flag")

    assertEquals((chatNode as TextNode).type, "chat")
    assertEquals((chatNode as TextNode).text, "Hallo")
    assertEquals((chatNode as TextNode).condition, "visited(Intro)")

    assertEquals((jumpNode as ActionNode).type, "jump")
    assertEquals((jumpNode as ActionNode).jumpTarget, "Next")
    assertEquals((jumpNode as ActionNode).condition, "$ready")

    assertEquals((setNode as CommandNode).type, "set")
    assertEquals((setNode as CommandNode).command, "$seen to true")
    assertEquals((setNode as CommandNode).condition, "$flag")
  })
})

Deno.test("parser groups adjacent same-indent random choices", async () => {
  const storyText = `title: Start
---
=> First random
=> Second random
Between groups
=> Third random
=> Fourth random
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const randomChoiceNodes = startBlock.contentNodes.filter((
      node,
    ): node is ActionNode => node.type === "randomChoice")

    assertEquals(randomChoiceNodes.length, 4)
    assertEquals(randomChoiceNodes.map((node) => node.text), [
      "First random",
      "Second random",
      "Third random",
      "Fourth random",
    ])
    assertEquals(randomChoiceNodes.map((node) => node.randomChoiceBlockId), [
      0,
      0,
      1,
      1,
    ])
    assertEquals(randomChoiceNodes.map((node) => node.myRandomChoiceLevel), [
      1,
      2,
      1,
      2,
    ])
  })
})

Deno.test("random choice renders one stable line from saved state", async () => {
  const storyText = `title: Start
---
=> First random
=> Second random
After random
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

    const visible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      { 0: 2 },
      context,
    )
    const texts = visible.visibleNodes
      .filter((node): node is ActionNode | TextNode =>
        node.type === "randomChoice" || node.type === "text"
      )
      .map((node) => node.text)

    assertEquals(texts, ["Second random", "After random"])
    assertEquals(visible.resolvedRandomChoices, { 0: 2 })
  })
})

Deno.test("random choice auto-resolves and can be replayed", async () => {
  const storyText = `title: Start
---
=> First random
=> Second random
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

    const firstPass = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )
    const selectedLevel = firstPass.resolvedRandomChoices[0]

    assert(selectedLevel === 1 || selectedLevel === 2)
    assertEquals(
      firstPass.visibleNodes.filter((node) => node.type === "randomChoice")
        .length,
      1,
    )

    const replay = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      firstPass.resolvedRandomChoices,
      context,
    )

    assertEquals(
      replay.visibleNodes
        .filter((node): node is ActionNode => node.type === "randomChoice")
        .map((node) => node.myRandomChoiceLevel),
      [selectedLevel],
    )
  })
})
