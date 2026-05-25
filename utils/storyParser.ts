import {
  ActionNode,
  Block,
  CommandNode,
  ConditionNode,
  ContentNode,
  Story,
  TextNode,
} from "@/utils/StoryTypes.tsx"

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

    const nestedLevel = (line.match(/^ */)?.[0] ?? "").length / 4 // defined by space count at line start

    if (nestedLevel % 1 !== 0) {
      throw new Error(
        `Inconsistent indentation in file: ${filePath}, line: ${index + 1}`,
      )
    }

    let contentNode: ContentNode | null = null

    if (trimmedLine.startsWith("<<")) {
      // variables
      if (trimmedLine.startsWith("<<declare ")) {
        const content = trimmedLine.substring(9).split(">>")[0].split("=")
        const key = content[0].trim()
        const value = content[1] ? parseDeclaredValue(content[1]) : ""
        story.variables.set(key, value)
        continue
      }

      if (trimmedLine.startsWith("<<set ")) {
        contentNode = {
          type: "set",
          identionLevel: nestedLevel,
          command: trimmedLine.substring(5).split(">>")[0].trim(),
        } as CommandNode
      } else if (trimmedLine.startsWith("<<Mood ")) {
        contentNode = {
          type: "mood",
          identionLevel: nestedLevel,
          command: trimmedLine.substring(7).split(">>")[0].trim(),
        } as CommandNode
      } else if (trimmedLine.startsWith("<<GatherScienceFact ")) {
        contentNode = {
          type: "scienceFact",
          identionLevel: nestedLevel,
          command: trimmedLine.substring(8).split(">>")[0].trim(),
        } as CommandNode
      }

      if (trimmedLine.startsWith("<<jump ")) {
        contentNode = {
          type: "jump",
          identionLevel: nestedLevel,
          jumpTarget: trimmedLine.substring(7).split(">>")[0].trim(),
        } as ActionNode
      } else if (trimmedLine.startsWith("<<detour ")) {
        contentNode = {
          type: "detour",
          identionLevel: nestedLevel,
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
            (lines[searchIndex].match(/^ */)?.[0] ?? "").length / 4

          if (searchNestedLevel % 1 !== 0) {
            throw new Error(
              `Inconsistent indentation in file: ${filePath}, line: ${
                index + 1
              }`,
            )
          }

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
          identionLevel: nestedLevel,
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
          identionLevel: nestedLevel,
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
          identionLevel: nestedLevel,
          endLine,
        } as ConditionNode
      } else if (trimmedLine.startsWith("<<endif")) {
        contentNode = {
          type: "endif",
          identionLevel: nestedLevel,
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
          identionLevel: nestedLevel,
          endLine,
        } as ConditionNode
      } else if (trimmedLine.startsWith("<<endonce")) {
        contentNode = {
          type: "endonce",
          endLine: index + 1,
          identionLevel: nestedLevel,
        } as ConditionNode
      }
    }

    if (trimmedLine.startsWith("-> ")) {
      contentNode = {
        type: "choice",
        identionLevel: nestedLevel,
        text: trimmedLine.substring(3).split(">>")[0].split("//")[0].trim(),
      }
    }

    // Check for chat line (e.g., "Kathrin: What a boring day...")
    if (trimmedLine.match(/^([^:]+):\s*(.*)$/)) {
      contentNode = {
        type: "chat",
        identionLevel: nestedLevel,
        speaker: trimmedLine.match(/^([^:]+):\s*(.*)$/)?.[1].trim(),
        text: trimmedLine.match(/^([^:]+):\s*(.*)$/)?.[2].trim(),
      } as TextNode
    }

    if (contentNode) {
      currentBlock.contentNodes.push(contentNode)
      continue
    }

    // default case: treat as text line
    const textNode = {
      type: "text",
      identionLevel: nestedLevel,
      text: trimmedLine.split("//")[0].trim(),
    } as TextNode

    currentBlock.contentNodes.push(textNode)
  }

  return story
}
