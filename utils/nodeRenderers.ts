import { ContentNode } from "@/utils/storyTypes.tsx"

export interface RenderHandlers {
  onChoiceClick: (index: number) => void
  onJumpClick: (target: string) => void
  onSetNode: (command: string) => void
  setCurrentIndentionLevel?: (updater: number | ((prev: number) => number)) => void
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
}

/**
 * Filter nodes that are visible based on indentation and choice level
 */
export function filterVisibleNodes(
  contentNodes: ContentNode[],
  indentionLevel: number,
  choices: number[],
): ContentNode[] {
  const visible: ContentNode[] = []

  for (let i = 0; i < contentNodes.length; i++) {
    const node = contentNodes[i]

    // Skip nodes at deeper indentation levels
    if (node.identionLevel > indentionLevel) {
      continue
    }

    // If this choice hasn't been selected, only show available choices
    if (!choices.includes(node.choiceLevel)) {
      if (node.type === "choice" && node.identionLevel === indentionLevel) {
        visible.push(node)
      }
      continue
    }

    // Node's choice is selected, include it
    if (node.identionLevel <= indentionLevel) {
      visible.push(node)
    }
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
 * Check if a node is a debug node (for display purposes)
 */
export function isDebugNode(node: ContentNode): boolean {
  return (
    node.type === "scienceFact" ||
    node.type === "scene" ||
    node.type === "if" ||
    node.type === "elseif" ||
    node.type === "else" ||
    node.type === "endif" ||
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
  if (
    node.type === "if" ||
    node.type === "elseif" ||
    node.type === "else" ||
    node.type === "endif"
  ) {
    return "bg-yellow-100 border-yellow-300"
  }
  if (node.type === "once" || node.type === "endonce") {
    return "bg-red-100 border-red-300"
  }
  return ""
}
