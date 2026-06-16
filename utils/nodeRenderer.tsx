import { handleConditionNode } from "@/utils/conditionHandler.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import { navigateToBlock } from "@/utils/storyStore.ts"
import {
  ActionNode,
  CommandNode,
  ConditionNode,
  ContentNode,
  TextNode,
} from "@/utils/storyTypes.tsx"

import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { ChoiceTranscript } from "@/components/ChoiceTranscript.tsx"
import { MoodImage } from "@/components/MoodImage.tsx"
import { Chat } from "@/components/Chat.tsx"
import { clsx } from "clsx"
import { JSX } from "preact/jsx-runtime"

export interface RenderHandlers {
  onChoiceClick: (index: number) => void
  onJumpClick: (target: string) => void
  onSetNode: (command: string) => void
  setCurrentIndentionLevel?: (
    updater: number | ((prev: number) => number),
  ) => void
  setChoices?: (updater: number[] | ((prev: number[]) => number[])) => void
}

export interface RenderContext {
  visitedBlocks: Set<string>
  variables: Map<string, string | number | boolean>
}

export interface RenderConfig {
  contentNodes: ContentNode[]
  indentionLevel: number
  choices: number[]
  handlers: RenderHandlers
  context: RenderContext
  /**
   * Per-node variable snapshots computed by buildNodeVariables(). When present,
   * each text/choice node reads its own snapshot instead of context.variables,
   * so multiple <<set>> commands within a block produce the correct intermediate
   * display values at each position.
   */
  nodeVariables?: WeakMap<ContentNode, Map<string, string | number | boolean>>
  /** When true, the block is read-only history — choices render as transcripts
   *  and jump buttons are suppressed. */
  isHistorical?: boolean
}

/**
 * Scan forward from fromIndex and return the index of the next elseif / else /
 * endif node at exactly targetLevel. Nodes at other indentation levels are
 * skipped, so nested if-blocks are transparently bypassed.
 *
 * Returns nodes.length when no matching branch is found (skip to end).
 */
function getNextBranchIndex(
  nodes: ContentNode[],
  fromIndex: number,
  targetLevel: number,
): number {
  for (let i = fromIndex + 1; i < nodes.length; i++) {
    const n = nodes[i]
    if (
      (n.type === "elseif" || n.type === "else" || n.type === "endif") &&
      n.identionLevel === targetLevel
    ) {
      return i
    }
  }
  return nodes.length
}

/**
 * Filter nodes that are visible based on:
 *   1. Active condition branches (if / elseif / else / endif)
 *   2. Choice-path selection
 */
export function filterVisibleNodes(
  contentNodes: ContentNode[],
  choices: number[],
  context: RenderContext,
): ContentNode[] {
  const visible: ContentNode[] = []

  // Stack entry: whether this branch body is active, and whether a true branch
  // has already been taken in this if-chain (done prevents later elseif/else).
  const conditionStack: Array<{ active: boolean; done: boolean }> = []

  const allConditionsActive = (): boolean =>
    conditionStack.every((c) => c.active)

  let i = 0
  while (i < contentNodes.length) {
    const node = contentNodes[i]

    // ── if ────────────────────────────────────────────────────────────────────
    if (node.type === "if") {
      const condNode = node as ConditionNode
      const result = allConditionsActive() &&
        handleConditionNode(
          condNode,
          context.visitedBlocks,
          context.variables,
        )
      conditionStack.push({ active: result, done: result })

      if (!result) {
        // Jump to the next branch at the same level (elseif / else / endif)
        i = getNextBranchIndex(contentNodes, i, condNode.identionLevel)
        // Don't increment — we land directly on the branch node
        continue
      }

      i++
      continue
    }

    // ── elseif ────────────────────────────────────────────────────────────────
    if (node.type === "elseif") {
      const condNode = node as ConditionNode
      const top = conditionStack.pop()!

      // Evaluate only when all outer conditions are active and no prior branch
      // in this chain was already taken.
      const result = allConditionsActive() && !top.done &&
        handleConditionNode(
          condNode,
          context.visitedBlocks,
          context.variables,
        )

      conditionStack.push({ active: result, done: top.done || result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, condNode.identionLevel)
        continue
      }

      i++
      continue
    }

    // ── else ──────────────────────────────────────────────────────────────────
    if (node.type === "else") {
      const top = conditionStack.pop()!
      // Take this branch only when all outer conditions are active and no prior
      // branch in this chain was taken.
      const active = allConditionsActive() && !top.done
      conditionStack.push({ active, done: true })
      i++
      continue
    }

    // ── endif ─────────────────────────────────────────────────────────────────
    if (node.type === "endif") {
      conditionStack.pop()
      i++
      continue
    }

    // ── once / endonce ────────────────────────────────────────────────────────
    // Not yet evaluated — skip silently (handled in a separate task).
    if (node.type === "once" || node.type === "endonce") {
      i++
      continue
    }

    // ── all other nodes ───────────────────────────────────────────────────────
    if (allConditionsActive()) {
      // Choice-path ancestor check: every value in the node's choicePath must
      // appear in the currently selected choices.
      if (node.choicePath.every((v) => choices.includes(v))) {
        // For choice nodes: hide siblings that weren't selected once a choice
        // at this depth has been made.
        if (
          node.type === "choice" &&
          choices.length > node.choicePath.length &&
          choices[node.choicePath.length] !==
            (node as ActionNode).myChoiceLevel!
        ) {
          i++
          continue
        }
        visible.push(node)
      }
    }

    i++
  }

  return visible
}

/**
 * Determine if a node should be rendered
 */
export function isNodeVisible(
  node: ContentNode,
  visibleNodes: ContentNode[],
): boolean {
  return visibleNodes.includes(node)
}

/**
 * Get the node type for rendering purposes
 */
export function getNodeType(
  node: ContentNode,
): "text" | "chat" | "choice" | "jump" | "mood" | "set" | "debug" | "detour" {
  if (node.type === "text") return "text"
  if (node.type === "chat") return "chat"
  if (node.type === "choice") return "choice"
  if (node.type === "jump") return "jump"
  if (node.type === "mood") return "mood"
  if (node.type === "set") return "set"
  if (node.type === "detour") return "detour"
  return "debug" // once/endonce and any unhandled condition nodes
}

/**
 * Check if a node is a debug node (for display purposes)
 */
export function isDebugNode(node: ContentNode): boolean {
  return (
    node.type === "scienceFact" ||
    node.type === "scene" ||
    node.type === "once" ||
    node.type === "endonce"
  )
}

/**
 * Get debug node styling class
 */
export function getDebugNodeClass(node: ContentNode): string {
  if (node.type === "scienceFact" || node.type === "scene") {
    return "bg-green-100 border-green-300"
  }
  if (node.type === "once" || node.type === "endonce") {
    return "bg-red-100 border-red-300"
  }
  return ""
}

export function renderNode(
  node: ContentNode,
  index: number,
  contentNodes: ContentNode[],
  config: RenderConfig,
  visibleNodes: ContentNode[],
): JSX.Element[] {
  const result: JSX.Element[] = []

  if (!isNodeVisible(node, visibleNodes)) return result

  switch (getNodeType(node)) {
    case "text":
      result.push(
        <Text
          html={(node as TextNode).text}
          variables={config.nodeVariables?.get(node) ??
            config.context.variables}
        />,
      )
      break

    case "chat": {
      const chatNode = node as TextNode
      result.push(
        <Chat
          isAngela={chatNode.speaker === "Angela"}
          sender={String(chatNode.speaker)}
        >
          {chatNode.text}
        </Chat>,
      )
      break
    }

    case "mood":
      result.push(<MoodImage name={(node as CommandNode).command} />)
      break

    case "set":
      // Handled in useEffect after render — intentionally skipped here.
      break

    case "detour":
      result.push(<>DETOUR</>)
      break

    case "choice": {
      const choiceNode = node as ActionNode

      // Historical block: render the chosen option as a styled read-only
      // transcript instead of an interactive button.
      if (config.isHistorical) {
        result.push(
          <ChoiceTranscript
            html={choiceNode.text || ""}
            variables={config.nodeVariables?.get(node) ??
              config.context.variables}
          />,
        )
        break
      }

      result.push(
        <Button
          choiceId={String(choiceNode.myChoiceLevel)}
          onClick={() => handleChoiceClick(contentNodes, index)}
          html={choiceNode.text || ""}
          disabled={config.choices.length > choiceNode.choicePath.length &&
            config.choices[choiceNode.choicePath.length] ===
              choiceNode.myChoiceLevel!}
        />,
      )
      break
    }

    case "jump": {
      // Historical block: the jump was already taken — suppress the button.
      if (config.isHistorical) break

      const jumpNode = node as ActionNode
      if (!jumpNode.jumpTarget) {
        console.error("Jump node missing jumpTarget", jumpNode)
        break
      }
      result.push(
        <Button
          choiceId=">"
          onClick={() => navigateToBlock(jumpNode.jumpTarget || "")}
        >
          {`Continue ${jumpNode.jumpTarget ? `to ${jumpNode.jumpTarget}` : ""}`}
        </Button>,
      )
      break
    }

    case "debug":
      if (isDebugNode(node)) {
        result.push(
          <div
            class={clsx(
              "w-full py-2 px-4 rounded-sm border",
              getDebugNodeClass(node),
            )}
          >
            Type: {node.type}
            <br />
            {node.type === "scienceFact" || node.type === "scene"
              ? `NodeCommand: ${(node as CommandNode).command}`
              : null}
            <br />
            IdentionLevel: {node.identionLevel}
          </div>,
        )
      }
      break
  }

  return result
}
