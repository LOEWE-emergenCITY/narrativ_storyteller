export type DebugPathAction =
  | { type: "choice"; key: string }
  | { type: "continue" }

export function getChoiceShortcutLabel(choiceLevel?: number): string | null {
  if (choiceLevel === undefined || choiceLevel < 1 || choiceLevel > 35) {
    return null
  }

  if (choiceLevel <= 9) return String(choiceLevel)

  return String.fromCharCode("A".charCodeAt(0) + choiceLevel - 10)
}

export function parseDebugPath(path: string): DebugPathAction[] {
  const actions: DebugPathAction[] = []

  for (const rawKey of path.replace(/\s/g, "")) {
    const key = rawKey.toUpperCase()
    if (key === "-") {
      actions.push({ type: "continue" })
      continue
    }

    if (/^[1-9A-Z]$/.test(key)) {
      actions.push({ type: "choice", key })
      continue
    }

    throw new Error(
      `Ungültiges Zeichen an Position ${actions.length + 1}: ${rawKey}`,
    )
  }

  return actions
}
