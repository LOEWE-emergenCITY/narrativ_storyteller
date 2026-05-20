//------- Interface definitions for story structure --------------------------------------------------------------

export interface Story {
  file: string
  blocks: Map<string, Block>
  variables: Map<string, string | number | boolean>
}

export interface Block {
  title: string
  group?: string // e.g., "Setup", "EskalationInternetUndWasser"
  tags?: string[] // e.g., ["scene:KathrinBrowsesOnPhone", "gameInteraction:PlayerTakesOver"]
  position?: string // e.g., "-61,632" (visual position in editor)
  color?: string
  visited: boolean
  contentLines: Map<number, string | ContentNode>
}

export type ContentNode = TextNode | ActionNode | CommandNode | ConditionNode

export interface ActionNode {
  type: "choice" | "jump" | "detour"
  jumpTarget?: string // for "jump" and "detour"
  //   choice?: { text: string; nextLine: number; siblingLine: number } // for "choice"
  text?: string
  nextLine?: number
  siblingLine?: number // for "choice"
  returnTargetLine?: { title: string; line: number } // for "detour" to return to the original flow after detour
}

export interface CommandNode {
  type: "set" | "mood" | "scienceFact"
  command: string // e.g., "set mood=tense" or "mood KathrinBrowsesOnPhone"
}

// in true case just map.next() to next line, in false case jump to endLine
export interface ConditionNode {
  type: "if" | "else" | "elseif" | "endif" | "once" | "endonce"
  condition?: string // e.g., "if mood == tense" || if condition == null => jump to next line
  endLine: number
}

export interface TextNode {
  type: "text" | "chat"
  speaker?: string // e.g., "Kathrin"
  text: string // e.g., "What a boring day..."
}

//-------------------------------------------------------------------------------------------------------

function parseDeclaredValue(value: string): string | number | boolean {
  const trimmed = value.trim()
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true"
  }

  const numericValue = Number(trimmed)
  if (trimmed !== "" && !Number.isNaN(numericValue)) {
    return numericValue
  }

  return trimmed
}

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
    contentLines: new Map<number, string | ContentNode>(),
  } as Block

  const lines = fileContent.split("\n")
  for (const [index, line] of lines.entries()) {
    if (line.startsWith("===")) {
      story.blocks.set(currentBlock.title, currentBlock)
      currentBlock = {
        title: "",
        group: undefined,
        tags: undefined,
        position: undefined,
        visited: false,
        contentLines: new Map<number, string | ContentNode>(),
      } as Block
      continue
    }

    const trimmedLine = line.trim()

    // skip empty lines and comments (lines starting with "//")
    if (
      trimmedLine === "" || trimmedLine.startsWith("//") ||
      trimmedLine.startsWith("---")
    ) {
      continue
    }

    // Check for block metadata (title, group, tags, position)
    if (line.startsWith("title:")) {
      currentBlock.title = line.substring(6).trim()
      continue
    }

    if (line.startsWith("group:")) {
      currentBlock.group = line.substring(6).trim()
      continue
    }

    if (line.startsWith("tags:")) {
      currentBlock.tags = line
        .substring(5)
        .split(",")
        .map((tag) => tag.trim())
      continue
    }

    if (line.startsWith("position:")) {
      currentBlock.position = line.substring(9).trim()
      continue
    }

    if (line.startsWith("color:")) {
      currentBlock.color = line.substring(6).trim()
      continue
    }

    // main content validation and parsing

    const nestedLevel = (line.match(/^ */)?.[0] ?? "").length // defined by space count at line start

    let contentNode: ContentNode | null = null

    if (trimmedLine.startsWith("<<")) {
      // variables
      if (trimmedLine.startsWith("<<declare ")) {
        const content = trimmedLine.substring(9).split(">>")
        const varName = content[0].trim()
        const value = parseDeclaredValue(content[1] ?? "")
        story.variables.set(varName, value)
        continue
      }

      if (trimmedLine.startsWith("<<set ")) {
        contentNode = {
          type: "set",
          command: trimmedLine.substring(5).split(">>")[0].trim(),
        } as CommandNode
      } else if (trimmedLine.startsWith("<<Mood ")) {
        contentNode = {
          type: "mood",
          command: trimmedLine.substring(7).split(">>")[0].trim(),
        } as CommandNode
      } else if (trimmedLine.startsWith("<<GatherScienceFact ")) {
        contentNode = {
          type: "scienceFact",
          command: trimmedLine.substring(8).split(">>")[0].trim(),
        } as CommandNode
      }

      if (trimmedLine.startsWith("<<jump ")) {
        contentNode = {
          type: "jump",
          jumpTarget: trimmedLine.substring(7).split(">>")[0].trim(),
        } as ActionNode
      } else if (trimmedLine.startsWith("<<detour ")) {
        contentNode = {
          type: "detour",
          jumpTarget: trimmedLine.substring(10).split(">>")[0].trim(),
          returnTargetLine: { title: currentBlock.title, line: index + 1 }, // after detour, return to the line following the detour command
        } as ActionNode
      }

      // Um den endline index zu finden, müssen wir die verschachtelten if-Blöcke berücksichtigen.
      // betrachte dazu die nestedLevel des aktuellen if/elseif/else und suche das entsprechende endif auf demselben nestedLevel
      if (trimmedLine.startsWith("<<if ")) {
        let endLine = -1
        for (
          let searchIndex = index + 1;
          searchIndex < lines.length;
          searchIndex++
        ) {
          const searchLine = lines[searchIndex].trim()
          if (searchLine.startsWith("===")) {
            break
          }
          const searchNestedLevel =
            (lines[searchIndex].match(/^ */)?.[0] ?? "").length

          if (nestedLevel !== searchNestedLevel) {
            continue // consider only lines on the same nested level for matching if/elseif/else with endif
          }

          if (
            searchLine.startsWith("<<endif") ||
            searchLine.startsWith("<<elseif") ||
            searchLine.startsWith("<<else")
          ) {
            endLine = searchIndex
            break
          }
        }

        contentNode = {
          type: "if",
          condition: trimmedLine.substring(4).split(">>")[0].trim(),
          endLine,
        } as ConditionNode
      } else if (trimmedLine.startsWith("<<elseif ")) {
        let endLine = -1
        for (
          let searchIndex = index + 1;
          searchIndex < lines.length;
          searchIndex++
        ) {
          const searchLine = lines[searchIndex].trim()
          if (searchLine.startsWith("===")) {
            break
          }
          const searchNestedLevel =
            (lines[searchIndex].match(/^ */)?.[0] ?? "").length

          if (nestedLevel !== searchNestedLevel) {
            continue // consider only lines on the same nested level for matching if/elseif/else with endif
          }

          if (
            searchLine.startsWith("<<endif") ||
            searchLine.startsWith("<<elseif") ||
            searchLine.startsWith("<<else")
          ) {
            endLine = searchIndex
            break
          }
        }
        contentNode = {
          type: "elseif",
          condition: trimmedLine.substring(8).split(">>")[0].trim(),
          endLine,
        } as ConditionNode
      } else if (trimmedLine.startsWith("<<else")) {
        let endLine = -1
        for (
          let searchIndex = index + 1;
          searchIndex < lines.length;
          searchIndex++
        ) {
          const searchLine = lines[searchIndex].trim()
          if (searchLine.startsWith("===")) {
            break
          }
          const searchNestedLevel =
            (lines[searchIndex].match(/^ */)?.[0] ?? "").length

          if (nestedLevel !== searchNestedLevel) {
            continue // consider only lines on the same nested level for matching if/elseif/else with endif
          }

          if (
            searchLine.startsWith("<<endif")
          ) {
            endLine = searchIndex
            break
          }
        }
        contentNode = {
          type: "else",
          endLine,
        } as ConditionNode
      } else if (trimmedLine.startsWith("<<endif")) {
        contentNode = {
          type: "endif",
          endLine: index + 1,
        } as ConditionNode
      }

      if (trimmedLine.startsWith("<<once")) {
        let endLine = -1
        for (
          let searchIndex = index + 1;
          searchIndex < lines.length;
          searchIndex++
        ) {
          const searchLine = lines[searchIndex].trim()
          if (searchLine.startsWith("===")) {
            break
          }
          const searchNestedLevel =
            (lines[searchIndex].match(/^ */)?.[0] ?? "").length

          if (nestedLevel !== searchNestedLevel) {
            continue // consider only lines on the same nested level for matching if/elseif/else with endif
          }

          if (
            searchLine.startsWith("<<endonce")
          ) {
            endLine = searchIndex
            break
          }
        }

        contentNode = {
          type: "once",
          endLine,
        } as ConditionNode
      } else if (trimmedLine.startsWith("<<endonce")) {
        contentNode = {
          type: "endonce",
          endLine: index + 1,
        } as ConditionNode
      }
    }

    if (trimmedLine.startsWith("-> ")) {
      let siblingLine = -1
      for (
        let searchIndex = index + 1;
        searchIndex < lines.length;
        searchIndex++
      ) {
        const searchLine = lines[searchIndex].trim()

        if (searchLine.startsWith("===")) {
          break
        }

        const searchNestedLevel =
          (lines[searchIndex].match(/^ */)?.[0] ?? "").length

        if (nestedLevel !== searchNestedLevel) {
          continue // consider only lines on the same nested level for matching if/elseif/else with endif
        }

        if (
          searchLine.startsWith("-> ")
        ) {
          siblingLine = searchIndex
          break
        }
      }
      contentNode = {
        type: "choice",
        text: trimmedLine.substring(3).split(">>")[0].split("//")[0].trim(),
        nextLine: index + 1,
        siblingLine,
      }
    }

    // Check for chat line (e.g., "Kathrin: What a boring day...")
    if (trimmedLine.match(/^([^:]+):\s*(.*)$/)) {
      contentNode = {
        type: "chat",
        speaker: trimmedLine.match(/^([^:]+):\s*(.*)$/)?.[1].trim(),
        text: trimmedLine.match(/^([^:]+):\s*(.*)$/)?.[2].trim(),
      } as TextNode
    }

    if (contentNode) {
      currentBlock.contentLines.set(index, contentNode)
      continue
    }

    // default case: treat as text line
    const textNode = {
      type: "text",
      text: trimmedLine.split("//")[0].trim(),
    } as TextNode

    currentBlock.contentLines.set(index, textNode)
  }

  return story
}
