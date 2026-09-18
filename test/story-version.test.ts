import { assertEquals, assertThrows } from "jsr:@std/assert@^1.0.19"

import { parseStoryText } from "@/utils/storyParser.ts"

Deno.test("parseStoryText reads the story version declaration", () => {
  const story = parseStoryText(`title: Start
---
<<declare $story_version = 25>>
Start text
===
`)

  assertEquals(story.version, 25)
  assertEquals(story.variables.get("$story_version"), 25)
  assertEquals(story.blocks.has("Start"), true)
})

Deno.test("parseStoryText reads a version declared in a later block", () => {
  const story = parseStoryText(`title: Start
---
Start text
===
title: Next
---
<<declare $story_version = 26>>
Next text`)

  assertEquals(story.version, 26)
  assertEquals(story.variables.get("$story_version"), 26)
  assertEquals(story.blocks.has("Start"), true)
  assertEquals(story.blocks.has("Next"), true)
})

Deno.test("parseStoryText rejects invalid story versions", () => {
  for (
    const value of [
      "0",
      "-1",
      "1.5",
      '"25"',
      "true",
      '"v25"',
    ]
  ) {
    assertThrows(
      () => parseStoryText(`<<declare $story_version = ${value}>>`),
      Error,
      "$story_version must be a positive integer",
    )
  }
})

Deno.test("parseStoryText rejects duplicate story versions across blocks", () => {
  assertThrows(
    () =>
      parseStoryText(`title: Start
---
<<declare $story_version = 24>>
===
title: Next
---
<<declare $story_version = 25>>
===`),
    Error,
    "Duplicate $story_version declaration",
  )
})
