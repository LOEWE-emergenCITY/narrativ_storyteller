// ===== SET COMMAND HELPERS =====

import { ErrorReporter } from "@/utils/errorReporter.ts"
import { parseSetValue } from "@/utils/valueParser.ts"

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
