import { parseStory } from "@/utils/storyParser.ts"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
export default async function StoryPage() {
  try {
    // Call parser directly on server (no HTTP request needed)
    const story = await parseStory("data/stories/level3cbs-5.yarn")

    const currentBlock = story.blocks.at(1)
    if (!currentBlock) {
      return (
        <div class="min-h-screen bg-yellow-50 p-4">
          <div class="max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <h1 class="text-2xl font-bold text-yellow-600 mb-4">
              No Blocks Found
            </h1>
            <p class="text-gray-700 mb-4">
              The story file does not contain any blocks.
            </p>
          </div>
        </div>
      )
    }

    for (const [index, content] of currentBlock.contentLines.entries()) {
      if (content && typeof content === "object" && "type" in content) {
        if (content.type === "jump") {
          return (
            // this doesn'T work because this needs to be within islands
            <Button
              onClick={() => {
                // Handle jump logic here, e.g., navigate to another block
                console.log(`Jumping to: ${content.jumpTarget}`)
              }}
            >
              Jump to {content.jumpTarget}
            </Button>
          )
        }
      } else {
        // weil hier ein return ist, wird die schleife beendet.
        // ausbaufähig, aber es geht schon mal in eine gute richtung
        return <Text key={index}>{content as string}</Text>
      }
    }

    return <>{story}</>
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return (
      <div class="min-h-screen bg-red-50 p-4">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow p-6">
          <h1 class="text-2xl font-bold text-red-600 mb-4">
            Error Loading Story
          </h1>
          <p class="text-gray-700 mb-4">{errorMsg}</p>
        </div>
      </div>
    )
  }
}
