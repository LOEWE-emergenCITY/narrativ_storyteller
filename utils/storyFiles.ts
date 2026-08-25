export type StoryFileInfo = {
  path: string
  fileName: string
  version: number
  isDebug: boolean
  label: string
}

const STORY_FILE_PATTERN = /^(.+)-(\d+)(-debug)?\.yarn$/

export function parseStoryFileName(
  fileName: string,
  storiesDir = "data/stories",
): StoryFileInfo | null {
  const match = fileName.match(STORY_FILE_PATTERN)

  if (!match) return null

  const version = Number(match[2])
  const isDebug = match[3] !== undefined

  return {
    path: `${storiesDir}/${fileName}`,
    fileName,
    version,
    isDebug,
    label: `v${version}${isDebug ? "-debug" : ""}`,
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

export function getLatestStoryFileFromNames(
  fileNames: string[],
  storiesDir = "data/stories",
): StoryFileInfo {
  const storyFiles: StoryFileInfo[] = []

  for (const fileName of fileNames) {
    const storyFile = parseStoryFileName(fileName, storiesDir)
    if (storyFile) storyFiles.push(storyFile)
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
