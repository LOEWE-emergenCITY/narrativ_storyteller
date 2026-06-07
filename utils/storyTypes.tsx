//------- Interface definitions for story structure --------------------------------------------------------------

export interface Story {
  file: string
  blocks: Map<string, Block>
  visitedBlocks: Set<string>
  variables: Map<string, string | number | boolean>
}

export interface Block {
  title: string
  group?: string // e.g., "Setup", "EskalationInternetUndWasser"
  tags?: string[] // e.g., ["scene:KathrinBrowsesOnPhone", "gameInteraction:PlayerTakesOver"]
  position?: string // e.g., "-61,632" (visual position in editor)
  color?: string
  visited: boolean
  contentNodes: ContentNode[]
}

export type ContentNode = TextNode | ActionNode | CommandNode | ConditionNode

export interface ActionNode {
  type: "choice" | "jump" | "detour"
  identionLevel: number
  choiceLevel: [number]
  myChoiceLevel?: number // only for "choice" to track which choice was selected
  jumpTarget?: string // for "jump" and "detour"
  //   choice?: { text: string; nextLine: number; siblingLine: number } // for "choice"
  text?: string
  returnTargetLine?: { title: string; line: number } // for "detour" to return to the original flow after detour
}

export interface CommandNode {
  type: "set" | "mood" | "scienceFact" | "scene"
  identionLevel: number
  choiceLevel: [number]
  command: string // e.g., "set mood=tense" or "mood KathrinBrowsesOnPhone"
}

// in true case just map.next() to next line, in false case jump to endLine
export interface ConditionNode {
  type: "if" | "else" | "elseif" | "endif" | "once" | "endonce"
  identionLevel: number
  choiceLevel: [number]
  condition?: string // e.g., "if mood == tense" || if condition == null => jump to next line
  skipLines: number
}

export interface TextNode {
  type: "text" | "chat"
  identionLevel: number
  choiceLevel: [number]
  speaker?: string // e.g., "Kathrin"
  text: string // e.g., "What a boring day..."
}

//-------------------------------------------------------------------------------------------------------

function isActionNode(node: ContentNode): node is ActionNode {
  return node &&
    (node.type === "choice" || node.type === "jump" || node.type === "detour")
}

function isConditionNode(node: ContentNode): node is ConditionNode {
  return node &&
    (node.type === "if" || node.type === "elseif" || node.type === "else" ||
      node.type === "endif" || node.type === "once" || node.type === "endonce")
}

function isCommandNode(node: ContentNode): node is CommandNode {
  return node &&
    (node.type === "set" || node.type === "mood" ||
      node.type === "scienceFact" || node.type === "scene")
}

function isTextNode(node: ContentNode): node is TextNode {
  return node && (node.type === "text" || node.type === "chat")
}

export { isActionNode, isCommandNode, isConditionNode, isTextNode }
