import { define } from "@/utils.ts"
import StoryApp from "@/islands/StoryApp.tsx"
import { getLatestStoryFile } from "@/utils/storyFiles.ts"
import { parseStory } from "@/utils/storyParser.ts"

export default define.page(async () => {
  const storyFile = await getLatestStoryFile()
  const story = await parseStory(storyFile.path)
  const scienceFacts = JSON.parse(
    await Deno.readTextFile("data/science_facts.json"),
  ) as Record<string, string>

  return (
    <>
      <span class="fixed left-2 top-1 z-30 text-[0.6rem] text-header-muted opacity-50">
        {storyFile.label}
      </span>
      <StoryApp story={story} scienceFacts={scienceFacts} />
    </>
  )
})
