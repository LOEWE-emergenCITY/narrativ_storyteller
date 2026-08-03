import { handleConditionNode } from "@/utils/conditionHandler.ts"
import { applySetCommands } from "@/utils/setHandler.ts"
import {
  ActionNode,
  ChoiceState,
  CommandNode,
  ConditionNode,
  ContentNode,
  RandomChoiceState,
} from "@/utils/storyTypes.tsx"

export interface RenderContext {
  visitedBlocks: Set<string>
  seenOnceSections: Set<string>
  variables: Map<string, string | number | boolean>
}

export interface VisibleNodesResult {
  visibleNodes: ContentNode[]
  visibleOnceKeys: Set<string>
  resolvedRandomChoices: RandomChoiceState
}

export interface SequentialVisibleNodesResult extends VisibleNodesResult {
  nodeVariables: WeakMap<ContentNode, Map<string, string | number | boolean>>
  finalVariables: Map<string, string | number | boolean>
}

export interface VisibilityEvaluationOptions {
  /**
   * When evaluating a post-detour slice, stop before branch delimiters that
   * belong to the already-entered outer control flow.
   */
  resumeStartIndent?: number
}

export type ActiveBlockStatus =
  | "waiting_for_choice"
  | "auto_jump_now"
  | "resolving_branch"
  | "ready_to_continue"
  | "complete_without_continue"
  | "ready_to_detour"
  | "auto_detour_now"

export interface ActiveBlockProgress {
  status: ActiveBlockStatus
  continueTarget: string | null
  blockingChoicePathLength: number | null
  /** Line index (in the origin block's contentNodes) to resume from after a detour returns. */
  detourReturnLine: number | null
}

export function isUserVisibleNode(node: ContentNode): boolean {
  return node.type === "text" || node.type === "chat" || node.type === "mood" ||
    node.type === "scene" || node.type === "scienceFact" ||
    node.type === "randomChoice" || node.type === "choice"
}

function isRenderableNode(node: ContentNode): boolean {
  return isUserVisibleNode(node) && node.type !== "choice"
}

function matchesSelectedChoicePath(
  nodeChoicePath: ActionNode["choicePath"],
  choices: ChoiceState,
): boolean {
  return nodeChoicePath.every((entry) =>
    choices[String(entry.choiceBlockId)] === entry.choiceLevel
  )
}

function getSelectedChoiceLevel(
  choiceNode: ActionNode,
  choices: ChoiceState,
): number | undefined {
  return choiceNode.choiceBlockId === undefined
    ? undefined
    : choices[String(choiceNode.choiceBlockId)]
}

function getSelectedRandomChoiceLevel(
  randomChoiceNode: ActionNode,
  randomChoices: RandomChoiceState,
): number | undefined {
  return randomChoiceNode.randomChoiceBlockId === undefined
    ? undefined
    : randomChoices[String(randomChoiceNode.randomChoiceBlockId)]
}

function selectRandomChoiceLevel(nodes: ActionNode[]): number | undefined {
  const levels = nodes
    .map((node) => node.myRandomChoiceLevel)
    .filter((level): level is number => typeof level === "number")

  if (levels.length === 0) return undefined

  return levels[Math.floor(Math.random() * levels.length)]
}

function getRandomChoiceGroupCandidates(
  contentNodes: ContentNode[],
  startIndex: number,
  choices: ChoiceState,
  visitedBlocks: Set<string>,
  seenOnceSections: Set<string>,
  variables: Map<string, string | number | boolean>,
): ActionNode[] {
  const firstNode = contentNodes[startIndex] as ActionNode
  const blockId = firstNode.randomChoiceBlockId
  if (blockId === undefined) return []

  const candidates: ActionNode[] = []
  for (let i = startIndex; i < contentNodes.length; i++) {
    const node = contentNodes[i]
    if (
      node.type !== "randomChoice" ||
      (node as ActionNode).randomChoiceBlockId !== blockId
    ) {
      break
    }

    if (node.onceKey && seenOnceSections.has(node.onceKey)) continue
    if (!matchesSelectedChoicePath(node.choicePath, choices)) continue
    if (!isNodeConditionMet(node, visitedBlocks, variables)) continue

    candidates.push(node as ActionNode)
  }

  return candidates
}

function isNodeConditionMet(
  node: ContentNode,
  visitedBlocks: Set<string>,
  variables: Map<string, string | number | boolean>,
): boolean {
  if (!("condition" in node) || !node.condition) {
    return true
  }

  return handleConditionNode(
    {
      type: "if",
      identionLevel: node.identionLevel,
      choicePath: node.choicePath,
      condition: node.condition,
      skipLines: 0,
    },
    visitedBlocks,
    variables,
  )
}

function isSelectedChoiceNode(
  node: ContentNode,
  choices: ChoiceState,
): boolean {
  if (node.type !== "choice") {
    return false
  }

  const choiceNode = node as ActionNode
  return getSelectedChoiceLevel(choiceNode, choices) ===
    choiceNode.myChoiceLevel
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

function isResumeBoundary(
  node: ContentNode,
  options?: VisibilityEvaluationOptions,
): boolean {
  return options?.resumeStartIndent !== undefined &&
    (node.type === "elseif" || node.type === "else" || node.type === "endif") &&
    node.identionLevel <= options.resumeStartIndent
}

function getInitialResumeBoundarySkipIndex(
  nodes: ContentNode[],
  options?: VisibilityEvaluationOptions,
): number | null {
  if (options?.resumeStartIndent === undefined || nodes.length === 0) {
    return null
  }

  const node = nodes[0]
  if (!isResumeBoundary(node, options)) return null

  if (node.type === "endif") return 1

  for (let i = 1; i < nodes.length; i++) {
    const candidate = nodes[i]
    if (
      candidate.type === "endif" &&
      candidate.identionLevel === node.identionLevel
    ) {
      return i + 1
    }
  }

  return nodes.length
}

function isFlowTransferNode(node: ContentNode): boolean {
  return node.type === "jump" || node.type === "detour"
}

export function filterVisibleNodes(
  contentNodes: ContentNode[],
  choices: ChoiceState,
  randomChoices: RandomChoiceState,
  context: RenderContext,
  options?: VisibilityEvaluationOptions,
): VisibleNodesResult {
  const visible: ContentNode[] = []
  const visibleOnceKeys = new Set<string>()
  const resolvedRandomChoices: RandomChoiceState = { ...randomChoices }
  const conditionStack: Array<{ active: boolean; done: boolean }> = []
  const onceStack: Array<{ active: boolean }> = []
  let blockingChoiceBlockId: number | null = null
  const initialResumeBoundarySkipIndex = getInitialResumeBoundarySkipIndex(
    contentNodes,
    options,
  )

  const allConditionsActive = (): boolean =>
    conditionStack.every((condition) => condition.active)
  const allOnceActive = (): boolean => onceStack.every((once) => once.active)

  let i = 0
  while (i < contentNodes.length) {
    const node = contentNodes[i]

    if (i === 0 && initialResumeBoundarySkipIndex !== null) {
      i = initialResumeBoundarySkipIndex
      continue
    }

    if (isResumeBoundary(node, options) && conditionStack.length === 0) break

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
      const top = conditionStack.pop()
      if (!top) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

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
      const top = conditionStack.pop()
      if (!top) {
        i = getNextBranchIndex(contentNodes, i, node.identionLevel)
        continue
      }

      const active = allConditionsActive() && !top.done
      conditionStack.push({ active, done: true })
      i++
      continue
    }

    if (node.type === "endif") {
      if (conditionStack.length > 0) conditionStack.pop()
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
      if (onceStack.length > 0) onceStack.pop()
      i++
      continue
    }

    if (allConditionsActive() && allOnceActive()) {
      if (node.onceKey && context.seenOnceSections.has(node.onceKey)) {
        i++
        continue
      }

      if (matchesSelectedChoicePath(node.choicePath, choices)) {
        if (
          !isNodeConditionMet(node, context.visitedBlocks, context.variables)
        ) {
          i++
          continue
        }

        if (
          blockingChoiceBlockId !== null &&
          (node.type !== "choice" ||
            (node as ActionNode).choiceBlockId !== blockingChoiceBlockId)
        ) {
          break
        }

        if (node.type === "choice") {
          const choiceNode = node as ActionNode
          const selectedLevel = getSelectedChoiceLevel(choiceNode, choices)

          if (
            selectedLevel !== undefined &&
            selectedLevel !== choiceNode.myChoiceLevel!
          ) {
            i++
            continue
          }

          if (selectedLevel === undefined) {
            blockingChoiceBlockId = choiceNode.choiceBlockId ?? null
          }
        }

        if (node.type === "randomChoice") {
          const randomChoiceNode = node as ActionNode
          const blockId = randomChoiceNode.randomChoiceBlockId

          if (blockId === undefined) {
            i++
            continue
          }

          const selectedLevel = getSelectedRandomChoiceLevel(
            randomChoiceNode,
            resolvedRandomChoices,
          ) ?? selectRandomChoiceLevel(
            getRandomChoiceGroupCandidates(
              contentNodes,
              i,
              choices,
              context.visitedBlocks,
              context.seenOnceSections,
              context.variables,
            ),
          )

          if (selectedLevel !== undefined) {
            resolvedRandomChoices[String(blockId)] = selectedLevel
          }

          if (selectedLevel !== randomChoiceNode.myRandomChoiceLevel) {
            i++
            continue
          }
        }

        if (node.onceKey) {
          visibleOnceKeys.add(node.onceKey)
        }

        visible.push(node)

        if (isFlowTransferNode(node)) break
      }
    }

    i++
  }

  return { visibleNodes: visible, visibleOnceKeys, resolvedRandomChoices }
}

export function evaluateVisibleNodesSequentially(
  contentNodes: ContentNode[],
  choices: ChoiceState,
  randomChoices: RandomChoiceState,
  context: RenderContext,
  options?: VisibilityEvaluationOptions,
): SequentialVisibleNodesResult {
  const visible: ContentNode[] = []
  const visibleOnceKeys = new Set<string>()
  const resolvedRandomChoices: RandomChoiceState = { ...randomChoices }
  const nodeVariables = new WeakMap<
    ContentNode,
    Map<string, string | number | boolean>
  >()
  const conditionStack: Array<{ active: boolean; done: boolean }> = []
  const onceStack: Array<{ active: boolean }> = []
  let blockingChoiceBlockId: number | null = null
  let currentVariables = new Map(context.variables)
  const initialResumeBoundarySkipIndex = getInitialResumeBoundarySkipIndex(
    contentNodes,
    options,
  )

  const allConditionsActive = (): boolean =>
    conditionStack.every((condition) => condition.active)
  const allOnceActive = (): boolean => onceStack.every((once) => once.active)

  let i = 0
  while (i < contentNodes.length) {
    const node = contentNodes[i]

    if (i === 0 && initialResumeBoundarySkipIndex !== null) {
      i = initialResumeBoundarySkipIndex
      continue
    }

    if (isResumeBoundary(node, options) && conditionStack.length === 0) break

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
      const top = conditionStack.pop()
      if (!top) {
        i = getNextBranchIndex(contentNodes, i, conditionNode.identionLevel)
        continue
      }

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
      const top = conditionStack.pop()
      if (!top) {
        i = getNextBranchIndex(contentNodes, i, node.identionLevel)
        continue
      }

      const active = allConditionsActive() && allOnceActive() && !top.done
      conditionStack.push({ active, done: true })
      i++
      continue
    }

    if (node.type === "endif") {
      if (conditionStack.length > 0) conditionStack.pop()
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
      if (onceStack.length > 0) onceStack.pop()
      i++
      continue
    }

    if (allConditionsActive() && allOnceActive()) {
      if (node.onceKey && context.seenOnceSections.has(node.onceKey)) {
        i++
        continue
      }

      if (matchesSelectedChoicePath(node.choicePath, choices)) {
        if (
          !isNodeConditionMet(node, context.visitedBlocks, currentVariables)
        ) {
          i++
          continue
        }

        if (
          blockingChoiceBlockId !== null &&
          (node.type !== "choice" ||
            (node as ActionNode).choiceBlockId !== blockingChoiceBlockId)
        ) {
          break
        }

        if (node.type === "choice") {
          const choiceNode = node as ActionNode
          const selectedLevel = getSelectedChoiceLevel(choiceNode, choices)

          if (
            selectedLevel !== undefined &&
            selectedLevel !== choiceNode.myChoiceLevel!
          ) {
            i++
            continue
          }

          if (selectedLevel === undefined) {
            blockingChoiceBlockId = choiceNode.choiceBlockId ?? null
          }
        }

        if (node.type === "randomChoice") {
          const randomChoiceNode = node as ActionNode
          const blockId = randomChoiceNode.randomChoiceBlockId

          if (blockId === undefined) {
            i++
            continue
          }

          const selectedLevel = getSelectedRandomChoiceLevel(
            randomChoiceNode,
            resolvedRandomChoices,
          ) ?? selectRandomChoiceLevel(
            getRandomChoiceGroupCandidates(
              contentNodes,
              i,
              choices,
              context.visitedBlocks,
              context.seenOnceSections,
              currentVariables,
            ),
          )

          if (selectedLevel !== undefined) {
            resolvedRandomChoices[String(blockId)] = selectedLevel
          }

          if (selectedLevel !== randomChoiceNode.myRandomChoiceLevel) {
            i++
            continue
          }
        }

        if (node.onceKey) {
          visibleOnceKeys.add(node.onceKey)
        }

        nodeVariables.set(node, new Map(currentVariables))
        visible.push(node)

        if (isFlowTransferNode(node)) break

        if (node.type === "choice" && isSelectedChoiceNode(node, choices)) {
          const inlineSetCommands = (node as ActionNode).inlineSetCommands ?? []
          if (inlineSetCommands.length > 0) {
            currentVariables = applySetCommands(
              inlineSetCommands,
              currentVariables,
            )
          }
        }

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
    resolvedRandomChoices,
    nodeVariables,
    finalVariables: currentVariables,
  }
}

export function evaluateActiveBlockProgress(
  contentNodes: ContentNode[],
  visibleNodes: ContentNode[],
  choices: ChoiceState,
): ActiveBlockProgress {
  const visibleSet = new Set(visibleNodes)
  let latestSelectedChoiceIndex = -1

  if (Object.keys(choices).length > 0) {
    for (const [index, node] of contentNodes.entries()) {
      if (!visibleSet.has(node) || node.type !== "choice") continue

      if (isSelectedChoiceNode(node, choices)) {
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
      const selectedLevel = getSelectedChoiceLevel(choiceNode, choices)

      if (selectedLevel === undefined) {
        return {
          status: "waiting_for_choice",
          continueTarget: null,
          blockingChoicePathLength: node.choicePath.length,
          detourReturnLine: null,
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
          detourReturnLine: null,
        }
      }

      return {
        status: !sawRenderableContent ? "auto_jump_now" : "ready_to_continue",
        continueTarget: jumpTarget,
        blockingChoicePathLength: null,
        detourReturnLine: null,
      }
    }

    if (node.type === "detour") {
      const detourNode = node as ActionNode
      const detourTarget = detourNode.jumpTarget ?? null

      if (!detourTarget) {
        return {
          status: "complete_without_continue",
          continueTarget: null,
          blockingChoicePathLength: null,
          detourReturnLine: null,
        }
      }

      return {
        status: !sawRenderableContent ? "auto_detour_now" : "ready_to_detour",
        continueTarget: detourTarget,
        blockingChoicePathLength: null,
        detourReturnLine: detourNode.returnTargetLine?.line ?? null,
      }
    }
  }

  return {
    status: "complete_without_continue",
    continueTarget: null,
    blockingChoicePathLength: null,
    detourReturnLine: null,
  }
}
