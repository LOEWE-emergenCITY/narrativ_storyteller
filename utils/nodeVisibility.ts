import { handleConditionNode } from "@/utils/conditionHandler.ts"
import { applySetCommands } from "@/utils/setHandler.ts"
import { ActionNode, CommandNode, ConditionNode, ContentNode } from "@/utils/storyTypes.tsx"

export interface RenderContext {
  visitedBlocks: Set<string>
  seenOnceSections: Set<string>
  variables: Map<string, string | number | boolean>
}

export interface VisibleNodesResult {
  visibleNodes: ContentNode[]
  visibleOnceKeys: Set<string>
}

export interface SequentialVisibleNodesResult extends VisibleNodesResult {
  nodeVariables: WeakMap<ContentNode, Map<string, string | number | boolean>>
  finalVariables: Map<string, string | number | boolean>
}

export type ActiveBlockStatus =
  | "waiting_for_choice"
  | "auto_jump_now"
  | "resolving_branch"
  | "ready_to_continue"
  | "complete_without_continue"

export interface ActiveBlockProgress {
  status: ActiveBlockStatus
  continueTarget: string | null
  blockingChoicePathLength: number | null
}

function isRenderableNode(node: ContentNode): boolean {
  return node.type === "text" || node.type === "chat" || node.type === "mood" ||
    node.type === "scene" || node.type === "scienceFact"
}

function getNextBranchIndex(
  nodes: ContentNode[],
  fromIndex: number,
  targetLevel: number,
): number {
  for (let i = fromIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]
    if (
      (node.type === "elseif" || node.type === "else" ||
        node.type === "endif") &&
      node.identionLevel === targetLevel
    ) {
      return i
    }
  }

  return nodes.length
}

export function filterVisibleNodes(
  contentNodes: ContentNode[],
  choices: number[],
  context: RenderContext,
): VisibleNodesResult {
  const visible: ContentNode[] = []
  const visibleOnceKeys = new Set<string>()
  const conditionStack: Array<{ active: boolean; done: boolean }> = []
  const onceStack: Array<{ active: boolean }> = []

  const allConditionsActive = (): boolean =>
    conditionStack.every((condition) => condition.active)
  const allOnceActive = (): boolean => onceStack.every((once) => once.active)

  let i = 0
  while (i < contentNodes.length) {
    const node = contentNodes[i]

    if (node.type === "if") {
      const conditionNode = node as ConditionNode
      const result = allConditionsActive() &&
        handleConditionNode(
          conditionNode,
          context.visitedBlocks,
          context.variables,
        )
      conditionStack.push({ active: result, done: result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

      i++
      continue
    }

    if (node.type === "elseif") {
      const conditionNode = node as ConditionNode
      const top = conditionStack.pop()!
      const result = allConditionsActive() && !top.done &&
        handleConditionNode(
          conditionNode,
          context.visitedBlocks,
          context.variables,
        )

      conditionStack.push({ active: result, done: top.done || result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

      i++
      continue
    }

    if (node.type === "else") {
      const top = conditionStack.pop()!
      const active = allConditionsActive() && !top.done
      conditionStack.push({ active, done: true })
      i++
      continue
    }

    if (node.type === "endif") {
      conditionStack.pop()
      i++
      continue
    }

    if (node.type === "once") {
      const isActive = allConditionsActive() && allOnceActive() &&
        (!node.onceKey || !context.seenOnceSections.has(node.onceKey))

      if (isActive && node.onceKey) {
        visibleOnceKeys.add(node.onceKey)
      }

      onceStack.push({ active: isActive })
      i++
      continue
    }

    if (node.type === "endonce") {
      onceStack.pop()
      i++
      continue
    }

    if (allConditionsActive() && allOnceActive()) {
      if (node.onceKey && context.seenOnceSections.has(node.onceKey)) {
        i++
        continue
      }

      if (node.choicePath.every((value) => choices.includes(value))) {
        if (
          node.type === "choice" &&
          choices.length > node.choicePath.length &&
          choices[node.choicePath.length] !==
            (node as ActionNode).myChoiceLevel!
        ) {
          i++
          continue
        }

        if (node.onceKey) {
          visibleOnceKeys.add(node.onceKey)
        }

        visible.push(node)
      }
    }

    i++
  }

  return { visibleNodes: visible, visibleOnceKeys }
}

export function evaluateVisibleNodesSequentially(
  contentNodes: ContentNode[],
  choices: number[],
  context: RenderContext,
): SequentialVisibleNodesResult {
  const visible: ContentNode[] = []
  const visibleOnceKeys = new Set<string>()
  const nodeVariables = new WeakMap<
    ContentNode,
    Map<string, string | number | boolean>
  >()
  const conditionStack: Array<{ active: boolean; done: boolean }> = []
  const onceStack: Array<{ active: boolean }> = []
  let currentVariables = new Map(context.variables)

  const allConditionsActive = (): boolean =>
    conditionStack.every((condition) => condition.active)
  const allOnceActive = (): boolean => onceStack.every((once) => once.active)

  let i = 0
  while (i < contentNodes.length) {
    const node = contentNodes[i]

    if (node.type === "if") {
      const conditionNode = node as ConditionNode
      const result = allConditionsActive() && allOnceActive() &&
        handleConditionNode(
          conditionNode,
          context.visitedBlocks,
          currentVariables,
        )
      conditionStack.push({ active: result, done: result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

      i++
      continue
    }

    if (node.type === "elseif") {
      const conditionNode = node as ConditionNode
      const top = conditionStack.pop()!
      const result = allConditionsActive() && allOnceActive() && !top.done &&
        handleConditionNode(
          conditionNode,
          context.visitedBlocks,
          currentVariables,
        )

      conditionStack.push({ active: result, done: top.done || result })

      if (!result) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

      i++
      continue
    }

    if (node.type === "else") {
      const top = conditionStack.pop()!
      const active = allConditionsActive() && allOnceActive() && !top.done
      conditionStack.push({ active, done: true })
      i++
      continue
    }

    if (node.type === "endif") {
      conditionStack.pop()
      i++
      continue
    }

    if (node.type === "once") {
      const isActive = allConditionsActive() && allOnceActive() &&
        (!node.onceKey || !context.seenOnceSections.has(node.onceKey))

      if (isActive && node.onceKey) {
        visibleOnceKeys.add(node.onceKey)
      }

      onceStack.push({ active: isActive })
      i++
      continue
    }

    if (node.type === "endonce") {
      onceStack.pop()
      i++
      continue
    }

    if (allConditionsActive() && allOnceActive()) {
      if (node.onceKey && context.seenOnceSections.has(node.onceKey)) {
        i++
        continue
      }

      if (node.choicePath.every((value) => choices.includes(value))) {
        if (
          node.type === "choice" &&
          choices.length > node.choicePath.length &&
          choices[node.choicePath.length] !==
            (node as ActionNode).myChoiceLevel!
        ) {
          i++
          continue
        }

        if (node.onceKey) {
          visibleOnceKeys.add(node.onceKey)
        }

        nodeVariables.set(node, new Map(currentVariables))
        visible.push(node)

        if (node.type === "set") {
          currentVariables = applySetCommands(
            [(node as CommandNode).command],
            currentVariables,
          )
        }
      }
    }

    i++
  }

  return {
    visibleNodes: visible,
    visibleOnceKeys,
    nodeVariables,
    finalVariables: currentVariables,
  }
}

export function evaluateActiveBlockProgress(
  contentNodes: ContentNode[],
  visibleNodes: ContentNode[],
  choices: number[],
): ActiveBlockProgress {
  const visibleSet = new Set(visibleNodes)
  let latestSelectedChoiceIndex = -1

  if (choices.length > 0) {
    for (const [index, node] of contentNodes.entries()) {
      if (!visibleSet.has(node) || node.type !== "choice") continue

      const choiceNode = node as ActionNode
      if (
        node.choicePath.length === choices.length - 1 &&
        choices[node.choicePath.length] === choiceNode.myChoiceLevel
      ) {
        latestSelectedChoiceIndex = index
      }
    }
  }

  let sawRenderableContent = false
  const scanStartIndex = latestSelectedChoiceIndex >= 0
    ? latestSelectedChoiceIndex + 1
    : 0

  for (let index = scanStartIndex; index < contentNodes.length; index++) {
    const node = contentNodes[index]
    if (!visibleSet.has(node)) continue

    if (isRenderableNode(node)) {
      sawRenderableContent = true
      continue
    }

    if (node.type === "choice") {
      const choiceNode = node as ActionNode
      const selectedLevel = choices[node.choicePath.length]

      if (selectedLevel === undefined) {
        return {
          status: "waiting_for_choice",
          continueTarget: null,
          blockingChoicePathLength: node.choicePath.length,
        }
      }

      if (selectedLevel !== choiceNode.myChoiceLevel) {
        continue
      }

      continue
    }

    if (node.type === "jump") {
      const jumpNode = node as ActionNode
      const jumpTarget = jumpNode.jumpTarget ?? null

      if (!jumpTarget) {
        return {
          status: "complete_without_continue",
          continueTarget: null,
          blockingChoicePathLength: null,
        }
      }

      return {
        status: choices.length > 0 && !sawRenderableContent
          ? "auto_jump_now"
          : "ready_to_continue",
        continueTarget: jumpTarget,
        blockingChoicePathLength: null,
      }
    }
  }

  return {
    status: "complete_without_continue",
    continueTarget: null,
    blockingChoicePathLength: null,
  }
}
