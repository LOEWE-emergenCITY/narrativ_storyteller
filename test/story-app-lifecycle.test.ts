import { assertEquals } from "jsr:@std/assert@^1.0.19"

import { shouldPersistStoryState } from "@/islands/StoryApp.tsx"

Deno.test("story state persistence is disabled before startup resolves", () => {
  assertEquals(shouldPersistStoryState(false, false), false)
  assertEquals(shouldPersistStoryState(false, true), false)
})

Deno.test("story state persistence is disabled until a session starts", () => {
  assertEquals(shouldPersistStoryState(true, false), false)
})

Deno.test("story state persistence is enabled for active sessions only", () => {
  assertEquals(shouldPersistStoryState(true, true), true)
})
