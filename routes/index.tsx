import { parseStory } from "@/utils/storyParser.ts"
import Login from "@/islands/Login.tsx"
import { define } from "@/utils.ts"

export default define.page(async () => {
  const story = await parseStory("data/stories/level3cbs-5.yarn")
  const scienceFacts = JSON.parse(
    await Deno.readTextFile("data/science_facts.json"),
  ) as Record<string, string>

  return (
    <>
      <Login initialStory={story} initialScienceFacts={scienceFacts} />
    </>
  )
})
