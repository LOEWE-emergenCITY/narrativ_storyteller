import {
  ActionNode,
  CommandNode,
  ConditionNode,
  ContentNode,
  TextNode,
} from "@/utils/storyParser.ts"
import { Text } from "@/components/Text.tsx"
import { Chat } from "@/components/Chat.tsx"
import { MoodImage } from "@/components/MoodImage.tsx"

interface LineRendererProps {
  line: ContentNode
  index: number
}

function isTextNode(node: ContentNode): node is TextNode {
  return node && (node.type === "text" || node.type === "chat")
}

function isActionNode(node: ContentNode): node is ActionNode {
  return node &&
    (node.type === "choice" || node.type === "jump" || node.type === "detour")
}

function isCommandNode(node: ContentNode): node is CommandNode {
  return node &&
    (node.type === "set" || node.type === "mood" || node.type === "scienceFact")
}

function isConditionNode(node: ContentNode): node is ConditionNode {
  return node &&
    (node.type === "if" || node.type === "elseif" || node.type === "else" ||
      node.type === "endif" || node.type === "once" || node.type === "endonce")
}

export function LineRenderer({ line, index }: LineRendererProps) {
  // ActionNodes are handled separately by ActionRenderer, return null
  if (isActionNode(line)) {
    return null
  }

  // TextNode (text or chat)
  if (isTextNode(line)) {
    if (line.type === "chat") {
      const isSender = line.speaker === "Angela"
      const isReceiver = !isSender
      return (
        <Chat key={index} isSender={isSender} isReceiver={isReceiver}>
          <div>
            {line.speaker && (
              <div class="font-bold text-sm mb-1">{line.speaker}</div>
            )}
            <div>{line.text}</div>
          </div>
        </Chat>
      )
    }
    // type === "text"
    return <Text key={index}>{line.text}</Text>
  }

  // ConditionNode - show with special styling and TODO label
  if (isConditionNode(line)) {
    const typeLabel: Record<string, string> = {
      if: "IF",
      elseif: "ELSE IF",
      else: "ELSE",
      endif: "END IF",
      once: "ONCE",
      endonce: "END ONCE",
    }

    return (
      <div
        key={index}
        class="bg-yellow-100 border-l-4 border-yellow-500 px-4 py-2 my-2"
      >
        <span class="font-bold text-sm">[{typeLabel[line.type]}]</span>
        {line.condition && <span class="text-xs ml-2">{line.condition}</span>}
        <span class="text-xs ml-2 text-gray-600">(Evaluation: TODO)</span>
      </div>
    )
  }

  // CommandNode
  if (isCommandNode(line)) {
    if (line.type === "mood") {
      // Extract mood name from command (e.g., "KathrinBrowsesOnPhone")
      const moodName = line.command.trim()
      return <MoodImage key={index} name={moodName} />
    }

    if (line.type === "set") {
      return (
        <Text key={index} className="bg-blue-100 px-2 py-1 rounded">
          [SET] {line.command}
        </Text>
      )
    }

    if (line.type === "scienceFact") {
      return (
        <Text key={index} className="bg-green-100 px-2 py-1 rounded">
          [FACT] {line.command}
        </Text>
      )
    }
  }

  // Fallback
  return <Text key={index}>{JSON.stringify(line)}</Text>
}
