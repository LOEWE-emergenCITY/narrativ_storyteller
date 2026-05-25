import {
  ActionNode,
  Block,
  CommandNode,
  ConditionNode,
  ContentNode,
  Story,
  TextNode,
} from "@/utils/StoryTypes.tsx"

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
      return searchIndex
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
  nestedLevel: number,
): CommandNode | null {
  if (trimmedLine.startsWith("<<set ")) {
    return {
      type: "set",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      command: trimmedLine.substring(5).split(">>")[0].trim(),
    } as CommandNode
  }

  if (trimmedLine.startsWith("<<Mood ")) {
    return {
      type: "mood",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      command: trimmedLine.substring(7).split(">>")[0].trim(),
    } as CommandNode
  }

  if (trimmedLine.startsWith("<<GatherScienceFact ")) {
    return {
      type: "scienceFact",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      command: trimmedLine.substring(20).split(">>")[0].trim(),
    } as CommandNode
  }

  return null
}

function parseActionNode(
  trimmedLine: string,
  nestedLevel: number,
  currentBlockTitle: string,
  currentLineIndex: number,
): ActionNode | null {
  if (trimmedLine.startsWith("<<jump ")) {
    return {
      type: "jump",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      jumpTarget: trimmedLine.substring(7).split(">>")[0].trim(),
    } as ActionNode
  }

  if (trimmedLine.startsWith("<<detour ")) {
    return {
      type: "detour",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
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
  nestedLevel: number,
  lines: string[],
  currentIndex: number,
  filePath: string,
): ConditionNode | null {
  if (trimmedLine.startsWith("<<if ")) {
    const endLine = findConditionBlockEnd(
      lines,
      currentIndex,
      nestedLevel,
      filePath,
    )
    return {
      type: "if",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      condition: trimmedLine.substring(5).split(">>")[0].trim(),
      endLine,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<elseif ")) {
    const endLine = findConditionBlockEnd(
      lines,
      currentIndex,
      nestedLevel,
      filePath,
    )
    return {
      type: "elseif",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      condition: trimmedLine.substring(9).split(">>")[0].trim(),
      endLine,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<else")) {
    const endLine = findConditionBlockEnd(
      lines,
      currentIndex,
      nestedLevel,
      filePath,
    )
    return {
      type: "else",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      endLine,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<endif")) {
    return {
      type: "endif",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      endLine: currentIndex + 1,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<once")) {
    const endLine = findOnceBlockEnd(
      lines,
      currentIndex,
      nestedLevel,
      filePath,
    )
    return {
      type: "once",
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
      endLine,
    } as ConditionNode
  }

  if (trimmedLine.startsWith("<<endonce")) {
    return {
      type: "endonce",
      endLine: currentIndex + 1,
      identionLevel: nestedLevel,
      choiceLevel: nestedLevel,
    } as ConditionNode
  }

  return null
}

function parseChoiceNode(
  trimmedLine: string,
  nestedLevel: number,
): ContentNode | null {
  return {
    type: "choice",
    identionLevel: nestedLevel,
    choiceLevel: nestedLevel,
    text: trimmedLine.substring(3).split(">>")[0].split("//")[0].trim(),
  } as ActionNode
}

function parseChatNode(
  trimmedLine: string,
  nestedLevel: number,
): TextNode | null {
  return {
    type: "chat",
    identionLevel: nestedLevel,
    choiceLevel: nestedLevel,
    speaker: trimmedLine.match(/^([^:]+):\s*(.*)$/)?.[1].trim(),
    text: trimmedLine.match(/^([^:]+):\s*(.*)$/)?.[2].trim(),
  } as TextNode
}

function parseTextNode(trimmedLine: string, nestedLevel: number): TextNode {
  return {
    type: "text",
    identionLevel: nestedLevel,
    choiceLevel: nestedLevel,
    text: trimmedLine.split("//")[0].trim(),
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
    const nestedLevel = getNestedLevel(line, filePath, index)

    let contentNode: ContentNode | null = null

    // Try parsing different node types in order
    if (trimmedLine.startsWith("<<")) {
      contentNode = parseCommandNode(trimmedLine, nestedLevel) ||
        parseActionNode(trimmedLine, nestedLevel, currentBlock.title, index) ||
        parseConditionNode(trimmedLine, nestedLevel, lines, index, filePath)
    }

    if (!contentNode) {
      if (trimmedLine.startsWith("-> ")) {
        contentNode = parseChoiceNode(trimmedLine, nestedLevel)
      } else if (trimmedLine.match(/^([^:]+):\s*(.*)$/)) {
        contentNode = parseChatNode(trimmedLine, nestedLevel)
      }
    }

    // Default to text node if nothing matched
    if (!contentNode) {
      contentNode = parseTextNode(trimmedLine, nestedLevel)
    }

    currentBlock.contentNodes.push(contentNode)
  }

  return story
}
