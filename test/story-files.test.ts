import { assertEquals, assertRejects } from "jsr:@std/assert@^1.0.19"

import {
  getLatestStoryFileFromNames,
  parseStoryFileName,
} from "@/utils/storyFiles.ts"

Deno.test("parseStoryFileName extracts normal story file metadata", () => {
  assertEquals(parseStoryFileName("level3cbs.yarn"), {
    path: "data/stories/level3cbs.yarn",
    fileName: "level3cbs.yarn",
    isDebug: false,
  })
})

Deno.test("parseStoryFileName extracts debug story file metadata", () => {
  assertEquals(parseStoryFileName("level3cbs-debug.yarn"), {
    path: "data/stories/level3cbs-debug.yarn",
    fileName: "level3cbs-debug.yarn",
    isDebug: true,
  })
})

Deno.test("parseStoryFileName ignores non-story files", () => {
  assertEquals(parseStoryFileName("notes.txt"), null)
  assertEquals(parseStoryFileName("level3cbs-25.yarn"), null)
})

Deno.test("getLatestStoryFileFromNames chooses the highest declared version", async () => {
  const contents: Record<string, string> = {
    "data/stories/level3cbs.yarn": "<<declare $story_version = 17>>",
    "data/stories/level3cbs-older.yarn": "<<declare $story_version = 14>>",
    "data/stories/level3cbs-debug.yarn": "<<declare $story_version = 13>>",
  }
  const latestStoryFile = await getLatestStoryFileFromNames(
    Object.keys(contents).map((path) => path.substring("data/stories/".length)),
    "data/stories",
    (path) => Promise.resolve(contents[path]),
  )

  assertEquals(latestStoryFile.fileName, "level3cbs.yarn")
  assertEquals(latestStoryFile.label, "v17")
})

Deno.test("getLatestStoryFileFromNames prefers normal files over debug files for the same version", async () => {
  const latestStoryFile = await getLatestStoryFileFromNames(
    ["level3cbs-debug.yarn", "level3cbs.yarn"],
    "data/stories",
    (path) => Promise.resolve("<<declare $story_version = 17>>"),
  )

  assertEquals(latestStoryFile.fileName, "level3cbs.yarn")
  assertEquals(latestStoryFile.label, "v17")
})

Deno.test("getLatestStoryFileFromNames labels debug files when debug is selected", async () => {
  const latestStoryFile = await getLatestStoryFileFromNames(
    ["level3cbs.yarn", "level3cbs-debug.yarn"],
    "data/stories",
    (path) =>
      Promise.resolve(
        path.endsWith("debug.yarn")
          ? "<<declare $story_version = 18>>"
          : "<<declare $story_version = 17>>",
      ),
  )

  assertEquals(latestStoryFile.fileName, "level3cbs-debug.yarn")
  assertEquals(latestStoryFile.label, "v18-debug")
})

Deno.test("getLatestStoryFileFromNames rejects when no matching story file exists", async () => {
  await assertRejects(
    () => getLatestStoryFileFromNames(["notes.txt"], "custom/stories"),
    Error,
    "No story files found in custom/stories",
  )
})
