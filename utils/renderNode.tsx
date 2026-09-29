import { Button } from "@/components/Button.tsx"
import { Chat } from "@/components/Chat.tsx"
import { ChoiceTranscript } from "@/components/ChoiceTranscript.tsx"
import { Image } from "@/components/Image.tsx"
import { ScienceFactBadge } from "@/components/ScienceFactBadge.tsx"
import { Text } from "@/components/Text.tsx"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import { RenderContext } from "@/utils/nodeVisibility.ts"
import {
  ActionNode,
  ChoiceState,
  CommandNode,
  ContentNode,
  TextNode,
} from "@/utils/storyTypes.tsx"
import { JSX } from "preact/jsx-runtime"

export interface RenderConfig {
  choices: ChoiceState
  context: RenderContext
  nodeVariables?: WeakMap<ContentNode, Map<string, string | number | boolean>>
  isHistorical?: boolean
  showDetourDebug?: boolean
  getChoiceShortcutLabel?: (choiceLevel?: number) => string | null
  onChoiceSelected?: (choiceLevel: number) => void
}

function getNodeType(
  node: ContentNode,
):
  | "text"
  | "chat"
  | "choice"
  | "jump"
  | "mood"
  | "set"
  | "scienceFact"
  | "randomChoice"
  | "debug"
  | "detour"
  | "scene" {
  if (node.type === "text") return "text"
  if (node.type === "chat") return "chat"
  if (node.type === "choice") return "choice"
  if (node.type === "jump") return "jump"
  if (node.type === "mood") return "mood"
  if (node.type === "set") return "set"
  if (node.type === "scienceFact") return "scienceFact"
  if (node.type === "randomChoice") return "randomChoice"
  if (node.type === "detour") return "detour"
  if (node.type === "scene") return "scene"
  return "debug"
}

function renderTextNode(
  node: TextNode,
  config: RenderConfig,
  index: number,
): JSX.Element {
  return (
    <Text
      key={`TEXT_${index}`}
      html={node.text}
      variables={config.nodeVariables?.get(node) ?? config.context.variables}
    />
  )
}

function renderChatNode(node: TextNode): JSX.Element {
  return (
    <Chat
      key={`CHAT_${node.speaker}_${node.text}`}
      isAngela={node.speaker === "Angela"}
      sender={String(node.speaker)}
    >
      {node.text}
    </Chat>
  )
}

function renderChoiceNode(
  node: ActionNode,
  index: number,
  contentNodes: ContentNode[],
  config: RenderConfig,
): JSX.Element {
  if (config.isHistorical) {
    return (
      <ChoiceTranscript
        html={node.text || ""}
        variables={config.nodeVariables?.get(node) ?? config.context.variables}
      />
    )
  }

  return (
    <Button
      choiceId={config.getChoiceShortcutLabel?.(node.myChoiceLevel) ??
        String(node.myChoiceLevel)}
      onClick={() =>
        handleChoiceClick(contentNodes, index, config.onChoiceSelected)}
      html={node.text || ""}
      disabled={node.choiceBlockId !== undefined &&
        config.choices[String(node.choiceBlockId)] === node.myChoiceLevel!}
    />
  )
}

function renderJumpNode(
  _node: ActionNode,
  config: RenderConfig,
): JSX.Element | null {
  if (!config.isHistorical) return null
  return null
}

export function resolveMoodName(
  command: string,
  variables: Map<string, string | number | boolean>,
): { name: string } {
  const match = command.match(/^(.*)_\{\$(\w+)\}$/)
  if (!match) return { name: command }

  const [, fallbackName, variableName] = match
  const suffix = variables.get(`$${variableName}`)
  if (typeof suffix !== "string" || suffix.length === 0) {
    return { name: fallbackName }
  }

  return {
    name: `${fallbackName}_${suffix}`,
  }
}

function renderMoodNode(
  node: CommandNode,
  config: RenderConfig,
): JSX.Element {
  const mood = resolveMoodName(
    node.command,
    config.nodeVariables?.get(node) ?? config.context.variables,
  )

  return (
    <Image
      key={`MOOD_${mood.name}`}
      name={mood.name}
      type="mood"
    />
  )
}

function renderSceneNode(node: CommandNode): JSX.Element {
  return (
    <Image
      key={`SCENE_${node.command}`}
      name={node.command}
      type="scene"
    />
  )
}

function renderScienceFactNode(node: CommandNode): JSX.Element {
  return (
    <ScienceFactBadge
      key={`SCIENCE_FACT_${node.command.trim()}`}
      name={node.command.trim()}
    />
  )
}

export function renderNode(
  node: ContentNode,
  index: number,
  contentNodes: ContentNode[],
  config: RenderConfig,
  visibleNodes: ContentNode[],
): JSX.Element[] {
  if (!visibleNodes.includes(node)) return []

  switch (getNodeType(node)) {
    case "text":
      return [
        renderTextNode(node as TextNode, config, index),
      ]

    case "chat":
      return [renderChatNode(node as TextNode)]

    case "mood":
      return [
        renderMoodNode(node as CommandNode, config),
      ]

    case "set":
      return []

    case "scienceFact":
      return [
        renderScienceFactNode(node as CommandNode),
      ]

    case "randomChoice":
      return [
        renderTextNode(node as TextNode, config, index),
      ]

    case "detour":
      if (!config.isHistorical || !config.showDetourDebug) return []
      return [
        <div
          key={`DETOUR_${index}`}
          class="w-full flex px-6 py-1 opacity-50"
        >
          <div class="flex items-center gap-2 text-xs text-theme-muted italic">
            DEBUG: detour -&gt; {(node as ActionNode).jumpTarget ?? "unknown"}
          </div>
        </div>,
      ]

    case "choice":
      return [
        renderChoiceNode(node as ActionNode, index, contentNodes, config),
      ]

    case "jump": {
      const jump = renderJumpNode(node as ActionNode, config)
      return jump ? [jump] : []
    }

    case "scene": {
      return [
        renderSceneNode(node as CommandNode),
      ]
    }

    case "debug":
    default:
      return []
  }
}
