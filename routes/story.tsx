import { parseStory } from "@/utils/storyParser.ts"
import Login from "@/islands/Login.tsx"

export default async function StoryPage() {
  const story = await parseStory("data/stories/level3cbs-5.yarn")

  return (
    <>
      <Login initialStory={story} />
    </>
  )
}
