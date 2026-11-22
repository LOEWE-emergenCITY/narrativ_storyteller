import { assertEquals } from "jsr:@std/assert@^1.0.19"

import { interpolateVariables } from "@/utils/customHooks.ts"

Deno.test("numeric variables are rounded to two decimal places for display", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$halfUp", 1.235],
    ["$halfDown", 1.234],
    ["$negativeHalfUp", -1.235],
    ["$integer", 42],
    ["$oneDecimal", 1.2],
    ["$binaryFloatEdge", 1.005],
  ])

  assertEquals(
    interpolateVariables(
      "{$halfUp}|{$halfDown}|{$negativeHalfUp}|{$integer}|{$oneDecimal}|{$binaryFloatEdge}",
      variables,
    ),
    "1.24|1.23|-1.24|42|1.2|1.01",
  )
})

Deno.test("nonnumeric and missing variables retain their existing display", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$text", "1.234"],
    ["$boolean", true],
  ])

  assertEquals(
    interpolateVariables("{$text}|{$boolean}|{$missing}", variables),
    "1.234|true|{$missing}",
  )
})
