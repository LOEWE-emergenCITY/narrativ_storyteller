import { assertEquals } from "jsr:@std/assert@^1.0.19"

import { handleConditionNode } from "@/utils/conditionHandler.ts"
import { ConditionNode } from "@/utils/storyTypes.tsx"
import { parseFraction, parseNumber } from "@/utils/valueParser.ts"

function evaluateCondition(
  condition: string,
  variables: Map<string, string | number | boolean>,
): boolean {
  const node: ConditionNode = {
    type: "if",
    identionLevel: 0,
    choicePath: [],
    condition,
    skipLines: 0,
  }

  return handleConditionNode(node, new Set(), variables)
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
