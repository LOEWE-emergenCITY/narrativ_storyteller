import StoryViewer from "@/islands/StoryViewer.tsx"
import { parseStory } from "@/utils/storyParser.ts"

export default async function StoryPage() {
  const story = await parseStory("data/stories/level3cbs-5.yarn")

  return (
    <>
      <StoryViewer initialStory={story} />
    </>
  )
}
