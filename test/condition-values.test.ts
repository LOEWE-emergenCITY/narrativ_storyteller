import { assertEquals } from "jsr:@std/assert@^1.0.19"

import { handleConditionNode } from "@/utils/conditionHandler.ts"
import { ConditionNode } from "@/utils/storyTypes.tsx"
import { parseFraction, parseNumber } from "@/utils/valueParser.ts"

function evaluateCondition(
  condition: string,
  variables: Map<string, string | number | boolean>,
  visitedBlocks = new Set<string>(),
): boolean {
  const node: ConditionNode = {
    type: "if",
    identionLevel: 0,
    choicePath: [],
    condition,
    skipLines: 0,
  }

  return handleConditionNode(node, visitedBlocks, variables)
}

Deno.test("negative numeric values work in simple conditions", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$social_score", -2],
  ])

  assertEquals(evaluateCondition("$social_score < -1", variables), true)
  assertEquals(evaluateCondition("$social_score >= -3", variables), true)
  assertEquals(evaluateCondition("$social_score == -2", variables), true)
})

Deno.test("negative numbers and fractions parse without changing their values", () => {
  assertEquals(parseNumber("-3"), -3)
  assertEquals(parseFraction("-3/2"), -1.5)
})

Deno.test("OR conditions preserve visited() function parentheses", () => {
  const visitedBlocks = new Set(["Energiesparen1"])

  assertEquals(
    evaluateCondition(
      'visited("Energiesparen1") or visited("Energiesparen2") or visited("Energiesparen2Ersatz")',
      new Map(),
      visitedBlocks,
    ),
    true,
  )
})

Deno.test("grouped OR conditions combine correctly with AND", () => {
  const visitedBlocks = new Set(["Energiesparen1"])
  const variables = new Map<string, string | number | boolean>([
    ["$eligible", true],
  ])

  assertEquals(
    evaluateCondition(
      '(visited("Energiesparen1") or visited("Energiesparen2")) and $eligible',
      variables,
      visitedBlocks,
    ),
    true,
  )
  assertEquals(
    evaluateCondition(
      '(visited("Energiesparen1") or visited("Energiesparen2")) and $missing',
      variables,
      visitedBlocks,
    ),
    false,
  )
})

Deno.test("AND binds more tightly than OR and parentheses override precedence", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$first", true],
    ["$second", false],
    ["$third", false],
  ])

  assertEquals(
    evaluateCondition("$first or $second and $third", variables),
    true,
  )
  assertEquals(
    evaluateCondition("($first or $second) and $third", variables),
    false,
  )
  assertEquals(
    evaluateCondition("$first and ($second or $third)", variables),
    false,
  )
})
