import { assertEquals } from "jsr:@std/assert@^1.0.19"

import { getImagePath } from "@/components/Image.tsx"
import { evaluateVisibleNodesSequentially } from "@/utils/nodeVisibility.ts"
import { resolveMoodName } from "@/utils/renderNode.tsx"
import { CommandNode } from "@/utils/storyTypes.tsx"
import { parseTestStory } from "@/test/helpers.ts"

Deno.test("resolves the state suffix in mood names", () => {
  assertEquals(
    resolveMoodName(
      "angela_worried_{$state}",
      new Map([["$state", "morning"]]),
    ),
    {
      name: "angela_worried_morning",
    },
  )
})

Deno.test("resolves a suffix from any variable", () => {
  assertEquals(
    resolveMoodName(
      "angela_worried_{$color_name}",
      new Map([["$color_name", "turquoise"]]),
    ),
    {
      name: "angela_worried_turquoise",
    },
  )
})

Deno.test("leaves static mood names unchanged", () => {
  assertEquals(
    resolveMoodName("angela_worried", new Map([["$state", "morning"]])),
    { name: "angela_worried" },
  )
})

Deno.test("uses the base mood for an unavailable suffix variable", () => {
  assertEquals(
    resolveMoodName("angela_worried_{$state}", new Map()),
    { name: "angela_worried" },
  )
  assertEquals(
    resolveMoodName(
      "angela_worried_{$state}",
      new Map([["$state", 1]]),
    ),
    { name: "angela_worried" },
  )
})

Deno.test("mood resolution uses the variable state at each node", () => {
  const story = parseTestStory(`title: Start
---
<<declare $state = "morning">>
<<Mood angela_worried_{$state}>>
<<set $state to "evening">>
<<Mood angela_worried_{$state}>>
===`)
  const nodes = story.blocks.get("Start")!.contentNodes
  const result = evaluateVisibleNodesSequentially(nodes, {}, {}, {
    visitedBlocks: new Set(),
    seenOnceSections: new Set(),
    variables: story.variables,
  })
  const moods = result.visibleNodes.filter(
    (node): node is CommandNode => node.type === "mood",
  )

  assertEquals(moods.length, 2)
  assertEquals(
    resolveMoodName(moods[0].command, result.nodeVariables.get(moods[0])!),
    { name: "angela_worried_morning" },
  )
  assertEquals(
    resolveMoodName(moods[1].command, result.nodeVariables.get(moods[1])!),
    { name: "angela_worried_evening" },
  )
})

Deno.test("mood resolution uses any suffix variable at each node", () => {
  const story = parseTestStory(`title: Start
---
<<declare $color_name = "yellow">>
<<Mood angela_worried_{$color_name}>>
<<set $color_name to "violet">>
<<Mood angela_worried_{$color_name}>>
===`)
  const nodes = story.blocks.get("Start")!.contentNodes
  const result = evaluateVisibleNodesSequentially(nodes, {}, {}, {
    visitedBlocks: new Set(),
    seenOnceSections: new Set(),
    variables: story.variables,
  })
  const moods = result.visibleNodes.filter(
    (node): node is CommandNode => node.type === "mood",
  )

  assertEquals(moods.length, 2)
  assertEquals(
    resolveMoodName(moods[0].command, result.nodeVariables.get(moods[0])!),
    { name: "angela_worried_yellow" },
  )
  assertEquals(
    resolveMoodName(moods[1].command, result.nodeVariables.get(moods[1])!),
    { name: "angela_worried_violet" },
  )
})

Deno.test("builds mood image paths", () => {
  assertEquals(
    getImagePath("angela_worried_morning", "mood"),
    "/moods/moods_angela/eHub_moods_angela_worried_morning.jpg",
  )
  assertEquals(
    getImagePath("angela_worried", "mood"),
    "/moods/moods_angela/eHub_moods_angela_worried.jpg",
  )
})
