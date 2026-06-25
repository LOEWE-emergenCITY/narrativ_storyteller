import { parseStory } from "@/utils/storyParser.ts"
import Login from "@/islands/Login.tsx"

export default async function StoryPage() {
  const story = await parseStory("data/stories/level3cbs-5.yarn")
  const scienceFacts = JSON.parse(
    await Deno.readTextFile("data/science_facts.json"),
  ) as Record<string, string>

  return (
    <>
      <Login initialStory={story} initialScienceFacts={scienceFacts} />
    </>
  )
}
