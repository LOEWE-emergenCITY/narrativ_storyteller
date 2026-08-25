import { define } from "@/utils.ts"
import { Header } from "@/components/Header.tsx"
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
      <Header versionLabel={storyFile.label} />
      <StoryApp story={story} scienceFacts={scienceFacts} />
    </>
  )
})
