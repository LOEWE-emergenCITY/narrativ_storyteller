import { assertEquals, assertThrows } from "jsr:@std/assert@^1.0.19"

import {
  getLatestStoryFileFromNames,
  parseStoryFileName,
} from "@/utils/storyFiles.ts"

Deno.test("parseStoryFileName extracts normal story file metadata", () => {
  assertEquals(parseStoryFileName("level3cbs-17.yarn"), {
    path: "data/stories/level3cbs-17.yarn",
    fileName: "level3cbs-17.yarn",
    version: 17,
    isDebug: false,
    label: "v17",
  })
})

Deno.test("parseStoryFileName extracts debug story file metadata", () => {
  assertEquals(parseStoryFileName("level3cbs-17-debug.yarn"), {
    path: "data/stories/level3cbs-17-debug.yarn",
    fileName: "level3cbs-17-debug.yarn",
    version: 17,
    isDebug: true,
    label: "v17-debug",
  })
})

Deno.test("parseStoryFileName ignores non-story files", () => {
  assertEquals(parseStoryFileName("notes.txt"), null)
  assertEquals(parseStoryFileName("level3cbs.yarn"), null)
})

Deno.test("getLatestStoryFileFromNames chooses the highest version", () => {
  const latestStoryFile = getLatestStoryFileFromNames([
    "level3cbs-14.yarn",
    "level3cbs-17.yarn",
    "level3cbs-13.yarn",
  ])

  assertEquals(latestStoryFile.fileName, "level3cbs-17.yarn")
  assertEquals(latestStoryFile.label, "v17")
})

Deno.test("getLatestStoryFileFromNames prefers normal files over debug files for the same version", () => {
  const latestStoryFile = getLatestStoryFileFromNames([
    "level3cbs-17-debug.yarn",
    "level3cbs-17.yarn",
  ])

  assertEquals(latestStoryFile.fileName, "level3cbs-17.yarn")
  assertEquals(latestStoryFile.label, "v17")
})

Deno.test("getLatestStoryFileFromNames labels debug files when debug is selected", () => {
  const latestStoryFile = getLatestStoryFileFromNames([
    "level3cbs-17.yarn",
    "level3cbs-18-debug.yarn",
  ])

  assertEquals(latestStoryFile.fileName, "level3cbs-18-debug.yarn")
  assertEquals(latestStoryFile.label, "v18-debug")
})

Deno.test("getLatestStoryFileFromNames rejects when no matching story file exists", () => {
  assertThrows(
    () => getLatestStoryFileFromNames(["notes.txt"], "custom/stories"),
    Error,
    "No story files found in custom/stories",
  )
})
