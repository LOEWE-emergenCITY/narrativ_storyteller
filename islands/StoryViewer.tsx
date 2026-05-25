import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import { ActionNode, Block, ContentNode, Story } from "@/utils/StoryTypes.tsx"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { MoodImage } from "@/components/MoodImage.tsx"
import { clsx } from "clsx"

function buttonChoiceHandler(
  choiceNode: ContentNode[],
  currentIndex: number,
  currentIdentionLevel: number,
  setCurrentBlockTitle: Dispatch<StateUpdater<string>>,
  setCurrentIndentionLevel: Dispatch<StateUpdater<number>>,
) {
  if (choiceNode[currentIndex].type !== "choice") {
    console.error(
      `Expected a choice node, but got a ${choiceNode[currentIndex].type} node`,
    )
    return
  }

  if (choiceNode[currentIndex + 1].type === "jump") {
    // handle jump, should set the current block to the jump target
    setCurrentBlockTitle(
      (choiceNode[currentIndex + 1] as ActionNode).jumpTarget || "",
    )
    return
  }

  setCurrentIndentionLevel(currentIdentionLevel + 1)
}

function contentNodesRenderer(
  contentNodes: ContentNode[],
  identionLevel: number,
  setCurrentBlockTitle: Dispatch<StateUpdater<string>>,
  setCurrentIndentionLevel: Dispatch<StateUpdater<number>>,
) {
  const renderedNodes = []
  let choiceId = 0

  for (let i = 0; i < contentNodes.length; i++) {
    const node = contentNodes[i]

    if (node.identionLevel > identionLevel) {
      continue
    }

    if (node.type === "text") {
      renderedNodes.push(
        <Text>{node.text}</Text>,
      )
    } else if (
      node.type === "mood"
    ) {
      renderedNodes.push(
        <MoodImage name={node.command} />,
      )
    } else if (
      node.type === "set" || node.type === "scienceFact"
    ) {
      renderedNodes.push(
        <div
          class={clsx(
            node.type === "set"
              ? "bg-blue-100 border-blue-300"
              : "bg-green-100 border-green-300",
            "w-full py-2 px-4 rounded-sm border",
          )}
        >
          NodeCommand: {node.command}
          IdentionLevel: {node.identionLevel}
        </div>,
      )
    } else if (
      node.type === "if" || node.type === "elseif" || node.type === "else" ||
      node.type === "endif" || node.type === "once" || node.type === "endonce"
    ) {
      renderedNodes.push(
        <div
          class={clsx(
            node.type === "once" || node.type === "endonce"
              ? "bg-red-100 border-red-300"
              : "bg-yellow-100 border-yellow-300",
            "w-full py-2 px-4 rounded-sm border",
          )}
        >
          NodeCondition: {node.condition}
          IdentionLevel: {node.identionLevel}
          EndLine: {node.endLine}
        </div>,
      )
    }

    if (node.identionLevel === identionLevel) {
      if (node.type === "choice") {
        choiceId++
        renderedNodes.push(
          <Button
            choiceId={String(choiceId)}
            onClick={() =>
              buttonChoiceHandler(
                contentNodes,
                i,
                identionLevel,
                setCurrentBlockTitle,
                setCurrentIndentionLevel,
              )}
          >
            {node.text}
          </Button>,
        )
      } else if (node.type === "jump") {
        if (node.jumpTarget === undefined) {
          console.error("Jump node missing jumpTarget", node)
          continue
        }
        renderedNodes.push(
          <Button
            choiceId="->"
            onClick={() => {
              setCurrentBlockTitle(node.jumpTarget || "")
            }}
          >
            {`Continue`}
          </Button>,
        )
      } else if (node.type === "detour") {
        renderedNodes.push(<>DETOUR</>)
      }
    }
  }

  return renderedNodes
}

function StoryViewer({ initialStory }: { initialStory: Story }) {
  const [currentBlock, setCurrentBlock] = useState<Block | undefined>(
    initialStory.blocks.get("Start"),
  )
  const [currentBlockTitle, setCurrentBlockTitle] = useState("Start")
  const [currentIndentionLevel, setCurrentIndentionLevel] = useState(0)

  useEffect(() => {
    setCurrentBlock(initialStory.blocks.get(currentBlockTitle))
  }, [currentBlockTitle])

  console.log(currentBlock?.contentNodes)

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col">
        {contentNodesRenderer(
          currentBlock?.contentNodes || [],
          currentIndentionLevel,
          setCurrentBlockTitle,
          setCurrentIndentionLevel,
        )}
      </div>
    </div>
  )
}

export default StoryViewer
