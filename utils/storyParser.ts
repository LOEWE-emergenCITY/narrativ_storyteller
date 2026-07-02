import {
  ActionNode,
  Block,
  CommandNode,
  ConditionNode,
  ContentNode,
  Story,
  TextNode,
} from "@/utils/storyTypes.tsx"

// ===== VALUE PARSING =====

function parseDeclaredValue(value: string): string | number | boolean {
  const trimmed = value.trim()
  // return boolean
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true"
  }

  // return number
  const numericValue = Number(trimmed)
  if (trimmed !== "" && !Number.isNaN(numericValue)) {
    return numericValue
  }

  // return string
  return trimmed.replace(/^"(.*)"$/, "$1") // remove surrounding quotes if present
}

// ===== SECTION 1: UTILITY & VALIDATION FUNCTIONS =====

function getNestedLevel(
  line: string,
  filePath: string,
  lineIndex: number,
): number {
  const nestedLevel = (line.match(/^ */)?.[0] ?? "").length / 4

  if (nestedLevel % 1 !== 0) {
    throw new Error(
      `Inconsistent indentation in file: ${filePath}, line: ${lineIndex + 1}`,
    )
  }

  return nestedLevel
}

function shouldSkipLine(trimmedLine: string): boolean {
  return (
    trimmedLine === "" || trimmedLine.startsWith("//") ||
    trimmedLine.startsWith("---")
  )
}

function stripTrailingComment(line: string): string {
  return line.split("//")[0].trimEnd()
}

function getOnceKey(blockTitle: string, lineIndex: number): string {
  return `${blockTitle}:${lineIndex}`
}

function extractInlineOnce(
  trimmedLine: string,
  currentBlockTitle: string,
  lineIndex: number,
): { line: string; onceKey?: string } {
  const lineWithoutComment = stripTrailingComment(trimmedLine).trim()

  if (lineWithoutComment.startsWith("<<once")) {
    return { line: lineWithoutComment }
  }

  const match = lineWithoutComment.match(/^(.*?)(?:\s*<<once>>)$/)
  if (!match) {
    return { line: lineWithoutComment }
  }

  return {
    line: match[1].trimEnd(),
    onceKey: getOnceKey(currentBlockTitle, lineIndex),
  }
}

interface InlineChoiceMetadata {
  text: string
  condition?: string
  onceKey?: string
  inlineSetCommands: string[]
}

function parseInlineChoiceMetadata(
  trimmedLine: string,
  currentBlockTitle: string,
  lineIndex: number,
): InlineChoiceMetadata {
  const rawContent = stripTrailingComment(trimmedLine.substring(3)).trim()
  const inlineSetCommands: string[] = []
  let condition: string | undefined
  let onceKey: string | undefined

  const text = rawContent.replace(/\s*<<(if\s+.+?|once|set\s+.+?)>>/g, (
    match,
    command,
  ) => {
    const trimmedCommand = String(command).trim()

    if (trimmedCommand.startsWith("if ")) {
      if (!condition) {
        condition = trimmedCommand.substring(3).trim()
      }
      return ""
    }

    if (trimmedCommand === "once") {
      if (!onceKey) {
        onceKey = getOnceKey(currentBlockTitle, lineIndex)
      }
      return ""
    }

    if (trimmedCommand.startsWith("set ")) {
      inlineSetCommands.push(trimmedCommand.substring(4).trim())
      return ""
    }

    return match
  }).replace(/\s{2,}/g, " ").trim()

  return {
    text,
    condition,
    onceKey,
    inlineSetCommands,
  }
}

function findConditionBlockEnd(
  lines: string[],
  startIndex: number,
  nestedLevel: number,
  filePath: string,
): number {
  // Um den endline index zu finden, müssen wir die verschachtelten if-Blöcke berücksichtigen.
  // betrachte dazu die nestedLevel des aktuellen if/elseif/else und suche das entsprechende endif auf demselben nestedLevel
  for (
    let searchIndex = startIndex + 1;
    searchIndex < lines.length;
    searchIndex++
  ) {
    const searchLine = lines[searchIndex].trim()
    if (searchLine.startsWith("===")) {
      break
    }

    const searchNestedLevel = getNestedLevel(
      lines[searchIndex],
      filePath,
      searchIndex,
    )

    if (nestedLevel !== searchNestedLevel) {
      continue // consider only lines on the same nested level for matching if/elseif/else with endif
    }

    if (
      searchLine.startsWith("<<endif") ||
      searchLine.startsWith("<<elseif") ||
      searchLine.startsWith("<<else")
    ) {
      return searchIndex - startIndex
    }
  }

  return -1
}

function findOnceBlockEnd(
  lines: string[],
  startIndex: number,
  nestedLevel: number,
  filePath: string,
): number {
  for (
    let searchIndex = startIndex + 1;
    searchIndex < lines.length;
    searchIndex++
  ) {
    const searchLine = lines[searchIndex].trim()
    if (searchLine.startsWith("===")) {
      break
    }

    const searchNestedLevel = getNestedLevel(
      lines[searchIndex],
      filePath,
      searchIndex,
    )

    if (nestedLevel !== searchNestedLevel) {
      continue // consider only lines on the same nested level for matching once with endonce
    }

    if (searchLine.startsWith("<<endonce")) {
      return searchIndex
    }
  }

  return -1
}

// ===== SECTION 2: METADATA PARSING =====

function parseBlockMetadata(line: string, currentBlock: Block): boolean {
  if (line.startsWith("title:")) {
    currentBlock.title = line.substring(6).trim()
    return true
  }

  if (line.startsWith("group:")) {
    currentBlock.group = line.substring(6).trim()
    return true
  }

  if (line.startsWith("tags:")) {
    currentBlock.tags = line
      .substring(5)
      .split(",")
      .map((tag) => tag.trim())
    return true
  }

  if (line.startsWith("position:")) {
    currentBlock.position = line.substring(9).trim()
    return true
  }

  if (line.startsWith("color:")) {
    currentBlock.color = line.substring(6).trim()
    return true
  }

  return false
}

// ===== SECTION 3: CONTENT NODE PARSERS =====

function parseCommandNode(
  trimmedLine: string,
  identionLevel: number,
  choicePath: number[],
  onceKey?: string,
): CommandNode | null {
  if (trimmedLine.startsWith("<<set ")) {
    return {
      type: "set",
      identionLevel,
      choicePath,
      onceKey,
      command: trimmedLine.substring(5).split(">>")[0].trim(),
    } as CommandNode
  }

  if (trimmedLine.startsWith("<<Mood ")) {
    return {
      type: "mood",
      identionLevel,
      choicePath,
      onceKey,
      command: trimmedLine.substring(7).split(">>")[0].trim(),
    } as CommandNode
  }

  if (trimmedLine.startsWith("<<Scene ")) {
    return {
      type: "scene",
      identionLevel,
      choicePath,
      onceKey,
      command: trimmedLine.substring(8).split(">>")[0].trim(),
    } as CommandNode
  }

  if (trimmedLine.startsWith("<<GatherScienceFact ")) {
    return {
      type: "scienceFact",
      identionLevel,
      choicePath,
      onceKey,
      command: trimmedLine.substring(20).split(">>")[0].trim(),
    } as CommandNode
  }

  return null
}

function parseActionNode(
  trimmedLine: string,
  identionLevel: number,
  choicePath: number[],
  currentBlockTitle: string,
  currentLineIndex: number,
  onceKey?: string,
): ActionNode | null {
  if (trimmedLine.startsWith("<<jump ")) {
    return {
      type: "jump",
      identionLevel,
      choicePath,
      onceKey,
      jumpTarget: trimmedLine.substring(7).split(">>")[0].trim(),
    } as ActionNode
  }

  if (trimmedLine.startsWith("<<detour ")) {
    return {
      type: "detour",
      identionLevel,
      choicePath,
      onceKey,
      jumpTarget: trimmedLine.substring(9).split(">>")[0].trim(),
      returnTargetLine: {
        title: currentBlockTitle,
        line: currentLineIndex + 1,
      }, // after detour, return to the line following the detour command
    } as ActionNode
  }

  return null
}

function parseConditionNode(
  trimmedLine: string,
  identionLevel: number,
  choicePath: number[],
  lines: string[],
  currentIndex: number,
  filePath: string,
  currentBlockTitle: string,
  onceKey?: string,
): ConditionNode | null {
  if (trimmedLine.startsWith("<<if ")) {
    const skipLines = findConditionBlockEnd(
      lines,
      currentIndex,
      identionLevel,
      filePath,
    )
    return {
      type: "if",
      identionLevel,
      choicePath,
      condition: trimmedLine.substring(5).split(">>")[0].trim(),
      skipLines,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<elseif ")) {
    const skipLines = findConditionBlockEnd(
      lines,
      currentIndex,
      identionLevel,
      filePath,
    )
    return {
      type: "elseif",
      identionLevel,
      choicePath,
      condition: trimmedLine.substring(9).split(">>")[0].trim(),
      skipLines,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<else")) {
    const skipLines = findConditionBlockEnd(
      lines,
      currentIndex,
      identionLevel,
      filePath,
    )
    return {
      type: "else",
      identionLevel,
      choicePath,
      skipLines,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<endif")) {
    return {
      type: "endif",
      identionLevel,
      choicePath,
      skipLines: 1,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<once")) {
    const skipLines = findOnceBlockEnd(
      lines,
      currentIndex,
      identionLevel,
      filePath,
    )
    return {
      type: "once",
      identionLevel,
      choicePath,
      onceKey: onceKey ?? getOnceKey(currentBlockTitle, currentIndex),
      skipLines,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<endonce")) {
    return {
      type: "endonce",
      skipLines: 1,
      identionLevel,
      choicePath,
    } as ConditionNode
  }

  return null
}

function parseChoiceNode(
  trimmedLine: string,
  identionLevel: number,
  activeChoicePath: number[],
  choiceCounters: number[],
  currentBlockTitle: string,
  lineIndex: number,
  onceKey?: string,
): [ContentNode | null, number[], number[]] {
  const choiceDepth = activeChoicePath.length
  const newChoiceLevel = choiceCounters[choiceDepth] !== undefined
    ? choiceCounters[choiceDepth] + 1
    : 1
  const inlineChoice = parseInlineChoiceMetadata(
    trimmedLine,
    currentBlockTitle,
    lineIndex,
  )

  const choiceNode = {
    type: "choice",
    identionLevel,
    choicePath: [...activeChoicePath],
    onceKey: onceKey ?? inlineChoice.onceKey,
    myChoiceLevel: newChoiceLevel,
    text: inlineChoice.text,
    condition: inlineChoice.condition,
    inlineSetCommands: inlineChoice.inlineSetCommands,
  } as ActionNode

  const nextActiveChoicePath = [...activeChoicePath, newChoiceLevel]
  const nextChoiceCounters = choiceCounters.slice(0, choiceDepth + 1)
  nextChoiceCounters[choiceDepth] = newChoiceLevel

  return [choiceNode, nextActiveChoicePath, nextChoiceCounters]
}

function parseChatNode(
  trimmedLine: string,
  identionLevel: number,
  choicePath: number[],
  onceKey?: string,
): TextNode | null {
  const sanitizedLine = stripTrailingComment(trimmedLine).trim()
  return {
    type: "chat",
    identionLevel,
    choicePath,
    onceKey,
    speaker: sanitizedLine.match(/^([^:]+):\s*(.*)$/)?.[1].trim(),
    text: sanitizedLine.match(/^([^:]+):\s*(.*)$/)?.[2].trim(),
  } as TextNode
}

function parseTextNode(
  trimmedLine: string,
  identionLevel: number,
  choicePath: number[],
  onceKey?: string,
): TextNode {
  return {
    type: "text",
    identionLevel,
    choicePath,
    onceKey,
    text: stripTrailingComment(trimmedLine).trim(),
  } as TextNode
}

// ===== SECTION 4: MAIN PARSER =====

export async function parseStory(filePath: string): Promise<Story> {
  let fileContent: string
  try {
    fileContent = await Deno.readTextFile(filePath)
  } catch (e) {
    throw new Error(
      `Failed to read story file: ${filePath}\n${(e as Error).message}`,
    )
  }

  const story: Story = {
    file: filePath,
    blocks: new Map<string, Block>(),
    variables: new Map<string, string | number>(),
    visitedBlocks: new Set<string>(),
  }

  let currentBlock = {
    title: "",
    group: undefined,
    tags: undefined,
    position: undefined,
    visited: false,
    contentNodes: [] as ContentNode[],
  } as Block

  const lines = fileContent.split("\n")
  let activeChoicePath: number[] = []
  let activeChoiceIndents: number[] = []
  let choiceCounters: number[] = []

  for (const [index, line] of lines.entries()) {
    // Handle block separator
    if (line.startsWith("===")) {
      story.blocks.set(currentBlock.title, currentBlock)
      currentBlock = {
        title: "",
        group: undefined,
        tags: undefined,
        position: undefined,
        visited: false,
        contentNodes: [] as ContentNode[],
      } as Block
      activeChoicePath = []
      activeChoiceIndents = []
      choiceCounters = []
      continue
    }

    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (shouldSkipLine(trimmedLine)) {
      continue
    }

    // Parse block metadata
    if (parseBlockMetadata(line, currentBlock)) {
      continue
    }

    // Handle variable declarations
    if (trimmedLine.startsWith("<<declare ")) {
      const content = trimmedLine.substring(10).split(">>")[0].split("=")
      const key = content[0].trim()
      const value = content[1] ? parseDeclaredValue(content[1]) : ""
      story.variables.set(key, value)
      continue
    }

    // Calculate nested level
    const indentionLevel = getNestedLevel(line, filePath, index)
    while (
      activeChoiceIndents.length > 0 &&
      activeChoiceIndents[activeChoiceIndents.length - 1] >= indentionLevel
    ) {
      activeChoiceIndents.pop()
      activeChoicePath.pop()
    }

    const inlineOnce = extractInlineOnce(trimmedLine, currentBlock.title, index)
    const sanitizedLine = inlineOnce.line
    const currentChoicePath = [...activeChoicePath]

    let contentNode: ContentNode | null = null

    // Try parsing different node types in order
    if (sanitizedLine.startsWith("<<")) {
        contentNode = parseCommandNode(
          sanitizedLine,
          indentionLevel,
          currentChoicePath,
          inlineOnce.onceKey,
        ) ||
        parseActionNode(
          sanitizedLine,
          indentionLevel,
          currentChoicePath,
          currentBlock.title,
          index,
          inlineOnce.onceKey,
        ) ||
        parseConditionNode(
          sanitizedLine,
          indentionLevel,
          currentChoicePath,
          lines,
          index,
          filePath,
          currentBlock.title,
          inlineOnce.onceKey,
        )
    }

    if (!contentNode) {
      if (sanitizedLine.startsWith("-> ")) {
        ;[contentNode, activeChoicePath, choiceCounters] = parseChoiceNode(
          sanitizedLine,
          indentionLevel,
          currentChoicePath,
          choiceCounters,
          currentBlock.title,
          index,
          inlineOnce.onceKey,
        )
        activeChoiceIndents = [...activeChoiceIndents, indentionLevel]
      } else if (sanitizedLine.match(/^([^:]+):\s*(.*)$/)) {
        contentNode = parseChatNode(
          sanitizedLine,
          indentionLevel,
          currentChoicePath,
          inlineOnce.onceKey,
        )
      }
    }

    // Default to text node if nothing matched
    if (!contentNode) {
      contentNode = parseTextNode(
        sanitizedLine,
        indentionLevel,
        currentChoicePath,
        inlineOnce.onceKey,
      )
    }

    currentBlock.contentNodes.push(contentNode)
  }

  return story
}
