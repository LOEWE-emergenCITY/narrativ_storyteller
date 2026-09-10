import { parseStoryText } from "@/utils/storyParser.ts"

export type StoryFileInfo = {
  path: string
  fileName: string
  isDebug: boolean
  version: number
  label: string
}

type StoryFileCandidate = Omit<StoryFileInfo, "version" | "label">

const STORY_FILE_PATTERN = /^(?!.*-\d+(?:-debug)?\.yarn$)(.+?)(-debug)?\.yarn$/

export function parseStoryFileName(
  fileName: string,
  storiesDir = "data/stories",
): StoryFileCandidate | null {
  const match = fileName.match(STORY_FILE_PATTERN)

  if (!match) return null

  const isDebug = match[2] !== undefined

  return {
    path: `${storiesDir}/${fileName}`,
    fileName,
    isDebug,
  }
}

export async function getLatestStoryFile(
  storiesDir = "data/stories",
): Promise<StoryFileInfo> {
  const fileNames: string[] = []

  for await (const entry of Deno.readDir(storiesDir)) {
    if (!entry.isFile) continue
    fileNames.push(entry.name)
  }

  return getLatestStoryFileFromNames(fileNames, storiesDir)
}

export async function getLatestStoryFileFromNames(
  fileNames: string[],
  storiesDir = "data/stories",
  readFile: (path: string) => Promise<string> = (path) =>
    Deno.readTextFile(path),
): Promise<StoryFileInfo> {
  const storyFiles: StoryFileInfo[] = []

  for (const fileName of fileNames) {
    const candidate = parseStoryFileName(fileName, storiesDir)
    if (!candidate) continue

    const story = parseStoryText(await readFile(candidate.path), candidate.path)
    if (story.version === null) continue

    storyFiles.push({
      ...candidate,
      version: story.version,
      label: `v${story.version}${candidate.isDebug ? "-debug" : ""}`,
    })
  }

  storyFiles.sort((a, b) => {
    if (a.version !== b.version) return b.version - a.version
    if (a.isDebug !== b.isDebug) return a.isDebug ? 1 : -1
    return a.fileName.localeCompare(b.fileName)
  })

  const latestStoryFile = storyFiles[0]
  if (!latestStoryFile) {
    throw new Error(`No story files found in ${storiesDir}`)
  }

  return latestStoryFile
}
