//------- Interface definitions for story structure --------------------------------------------------------------

export interface DetourReturn {
  title: string // origin block to return to
  line: number // contentNodes index to resume from (one past the <<detour>> tag)
  choices: number[] // choice path snapshot at the moment the detour was entered
}

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
  choicePath: [number]
  onceKey?: string
  myChoiceLevel?: number // only for "choice" to track which choice was selected
  jumpTarget?: string // for "jump" and "detour"
  condition?: string // optional line-level condition
  inlineSetCommands?: string[] // optional inline <<set>> commands for choice selection
  //   choice?: { text: string; nextLine: number; siblingLine: number } // for "choice"
  text?: string
  returnTargetLine?: { title: string; line: number } // for "detour" to return to the original flow after detour
}

export interface CommandNode {
  type: "set" | "mood" | "scienceFact" | "scene"
  identionLevel: number
  choicePath: [number]
  onceKey?: string
  condition?: string
  command: string // e.g., "set mood=tense" or "mood KathrinBrowsesOnPhone"
}

// in true case just map.next() to next line, in false case jump to endLine
export interface ConditionNode {
  type: "if" | "else" | "elseif" | "endif" | "once" | "endonce"
  identionLevel: number
  choicePath: [number]
  onceKey?: string
  condition?: string // e.g., "if mood == tense" || if condition == null => jump to next line
  skipLines: number
}

export interface TextNode {
  type: "text" | "chat"
  identionLevel: number
  choicePath: [number]
  onceKey?: string
  condition?: string
  speaker?: string // e.g., "Kathrin"
  text: string // e.g., "What a boring day..."
}
