import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import { ActionNode, Block, ContentNode, Story } from "@/utils/StoryTypes.tsx"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { MoodImage } from "@/components/MoodImage.tsx"
import { clsx } from "clsx"
import { Chat } from "@/components/Chat.tsx"

function buttonChoiceHandler(
  choiceNode: ContentNode[],
  currentIndex: number,
  setCurrentBlockTitle: Dispatch<StateUpdater<string>>,
  currentIdentionLevel: number,
  setCurrentIndentionLevel: Dispatch<StateUpdater<number>>,
  choices: number[],
  setChoices: Dispatch<StateUpdater<number[]>>,
) {
  if (choiceNode[currentIndex].type !== "choice") {
    console.error(
      `Expected a choice node, but got a ${choiceNode[currentIndex].type} node`,
    )
    return
  }

  setChoices([...choices, choiceNode[currentIndex].choiceLevel])

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
  setCurrentBlockTitle: Dispatch<StateUpdater<string>>,
  identionLevel: number,
  setCurrentIndentionLevel: Dispatch<StateUpdater<number>>,
  choices: number[],
  setChoices: Dispatch<StateUpdater<number[]>>,
  handleSetNode: (command: string) => void,
) {
  const renderedNodes = []

  for (let i = 0; i < contentNodes.length; i++) {
    const node = contentNodes[i]

    if (node.identionLevel > identionLevel) {
      continue
    }

    if (!choices.includes(node.choiceLevel)) {
      if (node.type === "choice" && node.identionLevel === identionLevel) {
        renderedNodes.push(
          <Button
            choiceId={String(node.choiceLevel)}
            onClick={() =>
              buttonChoiceHandler(
                contentNodes,
                i,
                setCurrentBlockTitle,
                identionLevel,
                setCurrentIndentionLevel,
                choices,
                setChoices,
              )}
          >
            {node.text}
          </Button>,
        )
      }

      continue
    }

    if (node.identionLevel === identionLevel) {
      if (node.type === "jump") {
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
            {`Continue ${node.jumpTarget ? `to ${node.jumpTarget}` : ""}`}
          </Button>,
        )
      } else if (node.type === "detour") {
        renderedNodes.push(<>DETOUR</>)
        continue
      }
    }

    if (node.type === "text") {
      renderedNodes.push(
        <Text>{node.text}</Text>,
      )
      continue
    }
    if (node.type === "chat") {
      renderedNodes.push(
        <Chat
          isAngela={node.speaker === "Angela"}
          sender={String(node.speaker)}
        >
          {node.text}
        </Chat>,
      )
      continue
    }
    if (
      node.type === "mood"
    ) {
      renderedNodes.push(
        <MoodImage name={node.command} />,
      )
      continue
    }
    if (
      node.type === "set"
    ) {
      handleSetNode(node.command)
    }
    if (
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
      continue
    }
    if (
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
          SkipLines: {node.skipLines}
        </div>,
      )
      continue
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
  const [choices, setChoices] = useState<number[]>([0])

  useEffect(() => {
    setCurrentBlock(initialStory.blocks.get(currentBlockTitle))
    setCurrentIndentionLevel(0)
    setChoices([0])
  }, [currentBlockTitle])

  function handleSetNode(command: string) {
    const [variableName, setCommand] = command.split("to").map((part) =>
      part.trim()
    )
    const commands = setCommand.split(" ")

    // if it's a simple set command like "set mood=tense"
    if (commands.length === 1) {
      if (
        initialStory.variables.has(variableName) &&
        initialStory.variables.has(commands[0])
      ) {
        // set variable to value of another variable
        initialStory.variables.set(
          variableName,
          initialStory.variables.get(commands[0])!,
        )
      } else if (commands[0] === "true" || commands[0] === "false") {
        // set boolean
        initialStory.variables.set(variableName, commands[0] === "true")
      } else if (commands[0].startsWith('"') && commands[0].endsWith('"')) {
        // set string
        initialStory.variables.set(variableName, commands[0].slice(1, -1))
      } else {
        console.error(`Invalid set command: ${command}`)
      }

      return
    }

    if (commands.length === 3) {
      const leftValue = initialStory.variables.get(commands[0]) as number
      const rightValue = Number(commands[2])

      if (commands[1] === "+") {
        initialStory.variables.set(variableName, leftValue + rightValue)
        return
      }

      if (commands[1] === "-") {
        initialStory.variables.set(variableName, leftValue - rightValue)
        return
      }

      console.error(`Invalid set command: ${command}`)
    }
  }

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col">
        {contentNodesRenderer(
          currentBlock?.contentNodes || [],
          setCurrentBlockTitle,
          currentIndentionLevel,
          setCurrentIndentionLevel,
          choices,
          setChoices,
          handleSetNode,
        )}
      </div>
    </div>
  )
}

export default StoryViewer
