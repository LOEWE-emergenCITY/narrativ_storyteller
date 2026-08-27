import { parseStoryText } from "@/utils/storyParser.ts"
import { Story } from "@/utils/storyTypes.tsx"

export function parseTestStory(contents: string): Story {
  return parseStoryText(contents, "<test-story>.yarn")
}

export async function withTestStory(
  contents: string,
  run: (contents: string) => Promise<void>,
): Promise<void> {
  await run(contents)
}
