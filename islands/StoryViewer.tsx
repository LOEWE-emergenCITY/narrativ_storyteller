import { parseStory } from "@/utils/storyParser.ts"

export default async function StoryViewer() {
  const story = await parseStory("data/stories/level3cbs-5.yarn")

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Story Viewer</h1>
      <p className="text-gray-700">
        This is where the story will be displayed.
      </p>
      {story}
    </div>
  )
}
