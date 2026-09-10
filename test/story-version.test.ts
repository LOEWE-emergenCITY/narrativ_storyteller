import { assertEquals, assertThrows } from "jsr:@std/assert@^1.0.19"

import { parseStoryText } from "@/utils/storyParser.ts"

Deno.test("parseStoryText reads the story version declaration", () => {
  const story = parseStoryText(`title: Start
---
<<declare $story_version = 25>>
`)

  assertEquals(story.version, 25)
  assertEquals(story.variables.get("$story_version"), 25)
})

Deno.test("parseStoryText rejects an invalid story version", () => {
  assertThrows(
    () => parseStoryText('<<declare $story_version = "v25">>'),
    Error,
    "$story_version must be a positive integer",
  )
})

Deno.test("parseStoryText rejects duplicate story versions", () => {
  assertThrows(
    () =>
      parseStoryText(
        `<<declare $story_version = 24>>
<<declare $story_version = 25>>`,
      ),
    Error,
    "Duplicate $story_version declaration",
  )
})
