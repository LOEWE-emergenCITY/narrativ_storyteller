import { useState } from "preact/hooks"
import { Block, ContentNode, Story } from "@/utils/StoryTypes.tsx"
import { Text } from "@/components/Text.tsx"

interface DetourReturn {
  blockTitle: string
  lineIndex: number
}

function contentNodesRenderer(contentNodes: ContentNode[]) {
  const renderedNodes = []

  for (let i = 0; i < contentNodes.length; i++) {
    const node = contentNodes[i]
    if (node.type === "text") {
      renderedNodes.push(
        <Text>{node.text}</Text>,
      )
    } else if (node.type === "choice") {
      // render choice node
    } else if (node.type === "jump") {
      // handle jump
    } else if (node.type === "detour") {
      // handle detour
    } else if (
      node.type === "set" || node.type === "mood" || node.type === "scienceFact"
    ) {
      // handle command
    } else if (
      node.type === "if" || node.type === "elseif" || node.type === "else" ||
      node.type === "endif" || node.type === "once" || node.type === "endonce"
    ) {
      // handle condition
    }
  }
}

function StoryViewer({ initialStory }: { initialStory: Story }) {
  const [currentBlock, setCurrentBlock] = useState<Block | undefined>(
    initialStory.blocks.get("Start"),
  )
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [detourReturnLocation, setDetourReturnLocation] = useState<
    DetourReturn | null
  >(null)

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col">
        hallo
      </div>
    </div>
  )
}

export default StoryViewer
