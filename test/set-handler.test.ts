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

Deno.test("set commands evaluate decimal arithmetic with precedence", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$battery", 98],
    ["$time", 4],
  ])

  const updated = applySetCommands([
    "$speed to $battery / ($time * 2)",
    "$battery to $battery - $speed * $time",
  ], variables)

  assertEquals(updated.get("$speed"), 12.25)
  assertEquals(updated.get("$battery"), 49)
})

Deno.test("set commands evaluate battery formulas without rounding", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$battery_level", 98.0],
    ["$battery_capacity", 98.0],
    ["$total_time", 100],
    ["$dthreshold", 0.70],
    ["$drain_battery_speed_modifier_max", 3],
    ["$drain_battery_speed_modifier", 0],
    ["$time_passes", 10],
    ["$previous_time", 4],
  ])

  const updated = applySetCommands([
    "$drain_battery_speed to $battery_capacity/($total_time*($dthreshold+((1-$dthreshold)/$drain_battery_speed_modifier_max)*$drain_battery_speed_modifier))",
    "$drain_battery_speed_no_shared_power to $drain_battery_speed*0.1",
    "$battery_level to $battery_level-$drain_battery_speed*($time_passes-$previous_time)",
  ], variables)

  assertEquals(updated.get("$drain_battery_speed"), 1.4)
  assertEquals(
    Math.round(
      Number(updated.get("$drain_battery_speed_no_shared_power")) * 100,
    ),
    14,
  )
  assertEquals(updated.get("$battery_level"), 89.6)
})

Deno.test("set commands evaluate repeated battery formulas working with elapsed time", () => {
  const variables = new Map<string, string | number | boolean>([
    ["$battery_level", 98.0],
    ["$battery_capacity", 98.0],
    ["$total_time", 100],
    ["$dthreshold", 0.70],
    ["$drain_battery_speed_modifier_max", 3],
    ["$drain_battery_speed_modifier", 0],
    ["$time_passes", 10],
    ["$previous_time", 0],
  ])

  const updated = applySetCommands([
    "$drain_battery_speed to $battery_capacity/($total_time*($dthreshold+((1-$dthreshold)/$drain_battery_speed_modifier_max)*$drain_battery_speed_modifier))",
    "$battery_level to $battery_level-$drain_battery_speed*($time_passes-$previous_time)",
    "$previous_time to $time_passes",
  ], variables)

  assertEquals(updated.get("$drain_battery_speed"), 1.4)
  assertEquals(updated.get("$battery_level"), 84)
  assertEquals(updated.get("$previous_time"), 10)

  updated.set("$time_passes", 15)

  const updatedTwice = applySetCommands([
    "$drain_battery_speed to $battery_capacity/($total_time*($dthreshold+((1-$dthreshold)/$drain_battery_speed_modifier_max)*$drain_battery_speed_modifier))",
    "$battery_level to $battery_level-$drain_battery_speed*($time_passes-$previous_time)",
    "$previous_time to $time_passes",
  ], updated)

  assertEquals(updatedTwice.get("$battery_level"), 77)
  assertEquals(updatedTwice.get("$previous_time"), 15)
})

Deno.test("set arithmetic rejects division by zero", () => {
  const variables = new Map<string, string | number | boolean>([["$value", 4]])
  const updated = applySetCommands(["$value to $value / 0"], variables)

  assertEquals(updated.get("$value"), 4)
})
