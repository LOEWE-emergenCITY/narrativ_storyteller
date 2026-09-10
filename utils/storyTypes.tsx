//------- Interface definitions for story structure --------------------------------------------------------------

export interface ChoicePathEntry {
  choiceBlockId: number
  choiceLevel: number
}

export type ChoiceState = Record<string, number>
export type RandomChoiceState = Record<string, number>

export interface DetourReturn {
  title: string // origin block to return to
  line: number // contentNodes index to resume from (one past the <<detour>> tag)
  choices: ChoiceState // choice snapshot at the moment the detour was entered
  randomChoices: RandomChoiceState // random-choice snapshot at the moment the detour was entered
}

export interface Story {
  file: string
  version: number | null
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
  type: "choice" | "jump" | "detour" | "randomChoice"
  identionLevel: number
  choicePath: ChoicePathEntry[]
  choiceBlockId?: number
  randomChoiceBlockId?: number
  onceKey?: string
  myChoiceLevel?: number // only for "choice" to track which choice was selected
  myRandomChoiceLevel?: number // only for "randomChoice" to track which line was picked
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
  choicePath: ChoicePathEntry[]
  onceKey?: string
  condition?: string
  command: string // e.g., "set mood=tense" or "mood KathrinBrowsesOnPhone"
}

// in true case just map.next() to next line, in false case jump to endLine
export interface ConditionNode {
  type: "if" | "else" | "elseif" | "endif" | "once" | "endonce"
  identionLevel: number
  choicePath: ChoicePathEntry[]
  onceKey?: string
  condition?: string // e.g., "if mood == tense" || if condition == null => jump to next line
  skipLines: number
}

export interface TextNode {
  type: "text" | "chat"
  identionLevel: number
  choicePath: ChoicePathEntry[]
  onceKey?: string
  condition?: string
  speaker?: string // e.g., "Kathrin"
  text: string // e.g., "What a boring day..."
}
