import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.19"

import { applySetCommands } from "@/utils/setHandler.ts"

function withMockedRandom<T>(value: number, run: () => T): T {
  const originalRandom = Math.random

  try {
    Math.random = () => value
    return run()
  } finally {
    Math.random = originalRandom
  }
}

function withMockedRandomSequence<T>(values: number[], run: () => T): T {
  const originalRandom = Math.random
  let index = 0

  try {
    Math.random = () => values[index++ % values.length]
    return run()
  } finally {
    Math.random = originalRandom
  }
}

Deno.test("random set command can return the lower integer bound", () => {
  const variables = new Map<string, string | number | boolean>()

  const updated = withMockedRandom(
    0,
    () => applySetCommands(["$value to random(1,10)"], variables),
  )

  assertEquals(updated.get("$value"), 1)
})

Deno.test("random set command can return the upper integer bound", () => {
  const variables = new Map<string, string | number | boolean>()

  const updated = withMockedRandom(
    0.999999,
    () => applySetCommands(["$value to random(1,10)"], variables),
  )

  assertEquals(updated.get("$value"), 10)
})

Deno.test("random set command does not always return the same value", () => {
  const variables = new Map<string, string | number | boolean>()
  const values = withMockedRandomSequence([0, 0.9, 0.1, 0.8], () =>
    Array.from(
      { length: 4 },
      () =>
        applySetCommands(["$value to random(0,1)"], variables).get("$value"),
    ))

  assertEquals(values, [0, 1, 0, 1])
  assertNotEquals(new Set(values).size, 1)
})
