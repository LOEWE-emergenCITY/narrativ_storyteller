// ===== SET COMMAND HELPERS =====

import { ErrorReporter } from "@/utils/errorReporter.ts"
import { parseSetValue } from "@/utils/valueParser.ts"
import { CommandNode, ContentNode } from "@/utils/storyTypes.tsx"

/**
 * Compute variable updates from <<set>> command strings without touching any
 * signal. Runs in a useEffect after render to avoid mutating signals mid-render
 * (which would cause an infinite render loop on blocks with <<set>> nodes).
 */
export function computeSetUpdates(
  commands: string[],
  variables: Map<string, string | number | boolean>,
): Map<string, string | number | boolean> {
  const updated = new Map(variables)
  const reporter = new ErrorReporter()

  for (const command of commands) {
    const [variableName, setCommand] = command.split(" to ").map((p) =>
      p.trim()
    )
    if (!variableName || !setCommand) continue

    const parts = setCommand.split(" ")

    if (parts[0].includes("random")) {
      const randomMatch = setCommand.match(/random\((\d+),\s*(\d+)\)/)
      if (randomMatch) {
        const min = parseInt(randomMatch[1], 10)
        const max = parseInt(randomMatch[2], 10)
        if (!isNaN(min) && !isNaN(max) && max > min) {
          const randomValue = Math.floor(Math.random() * (max - min + 1)) + min
          updated.set(variableName, randomValue)
        }
      }
      continue
    }

    if (parts.length === 1) {
      const value = parseSetValue(parts[0], updated, reporter)
      if (value !== null) updated.set(variableName, value)
      continue
    }

    if (parts.length === 3) {
      const [leftRaw, operator, rightRaw] = parts
      const left = parseSetValue(leftRaw, updated, reporter) as number
      const right = parseSetValue(rightRaw, updated, reporter) as number
      if (left !== null && right !== null) {
        if (operator === "+") updated.set(variableName, left + right)
        else if (operator === "-") updated.set(variableName, left - right)
      }
      continue
    }
  }

  return updated
}

/**
 * Walk visible nodes in order and build a per-node snapshot of the variable
 * state as it exists at the moment each node is rendered.
 *
 * Each <<set>> node advances the running state for all nodes that follow it,
 * so text nodes see exactly the variables that are in effect at their position
 * in the block — not the pre-block baseline and not the post-block final state.
 *
 * Also returns `finalVariables` — the variable state after ALL set nodes in the
 * visible list have been applied. This is the same computation that happens
 * during the walk, returned as a free byproduct, so callers can apply the final
 * state to the store without calling computeSetUpdates a second time (which
 * would re-roll random()).
 */
export function buildNodeVariables(
  visibleNodes: ContentNode[],
  baseVariables: Map<string, string | number | boolean>,
): {
  nodeVars: WeakMap<ContentNode, Map<string, string | number | boolean>>
  finalVariables: Map<string, string | number | boolean>
} {
  const nodeVars = new WeakMap<
    ContentNode,
    Map<string, string | number | boolean>
  >()
  const current = new Map(baseVariables)

  for (const node of visibleNodes) {
    // Snapshot the running state BEFORE this node so the node sees the result
    // of all preceding <<set>> commands but not its own (if it is a set node).
    nodeVars.set(node, new Map(current))

    if (node.type === "set") {
      const updates = computeSetUpdates(
        [(node as CommandNode).command],
        current,
      )
      updates.forEach((v, k) => current.set(k, v))
    }
  }

  return { nodeVars, finalVariables: current }
}
