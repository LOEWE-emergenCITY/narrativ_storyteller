import { define } from "@/utils.ts"
import StoryApp from "@/islands/StoryApp.tsx"
import { parseStory } from "@/utils/storyParser.ts"

export default define.page(async () => {
  const story = await parseStory("data/stories/level3cbs-14.yarn")
  const scienceFacts = JSON.parse(
    await Deno.readTextFile("data/science_facts.json"),
  ) as Record<string, string>

  return <StoryApp story={story} scienceFacts={scienceFacts} />
})
