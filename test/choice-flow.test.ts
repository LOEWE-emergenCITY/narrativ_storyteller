import { assert, assertEquals } from "jsr:@std/assert@^1.0.19"

import {
  evaluateActiveBlockProgress,
  evaluateVisibleNodesSequentially,
  filterVisibleNodes,
} from "@/utils/nodeVisibility.ts"
import { parseStory } from "@/utils/storyParser.ts"
import {
  activeBlockStatus,
  activeRenderSnapshot,
  applyVariables,
  blockEntryVariables,
  blockHistory,
  choices,
  continueBranch,
  currentBlockTitle,
  loadStory,
  navigateToDetour,
  pendingContinueTarget,
  seenOnceSections,
  selectChoice,
  storyVariables,
  updateActiveRenderSnapshot,
  visibleOnceSections,
  visitedBlocks,
} from "@/utils/storyStore.ts"
import { handleChoiceClick } from "@/utils/choiceHandler.ts"
import {
  getChoiceShortcutIndex,
  getChoiceShortcutLabel,
} from "@/islands/StoryViewer.tsx"
import { renderNode } from "@/utils/renderNode.tsx"
import { ActionNode, TextNode } from "@/utils/storyTypes.tsx"

async function withTempStory(
  contents: string,
  run: (path: string) => Promise<void>,
): Promise<void> {
  const tempFile = await Deno.makeTempFile({ suffix: ".yarn" })

  try {
    await Deno.writeTextFile(tempFile, contents)
    await run(tempFile)
  } finally {
    await Deno.remove(tempFile)
  }
}

Deno.test("choice flow waits for input, then exposes continue after branch settles", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
    <<jump Next>>
-> Second choice
    Other branch
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }

    const initialVisible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )
    const initialProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      initialVisible.visibleNodes,
      {},
    )

    assertEquals(initialProgress.status, "waiting_for_choice")
    assertEquals(initialProgress.continueTarget, null)

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedTexts = selectedVisible.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedTexts, ["Branch line"])
    assertEquals(selectedProgress.status, "ready_to_continue")
    assertEquals(selectedProgress.continueTarget, "Next")
  })
})

Deno.test("choice followed directly by jump auto-navigates", async () => {
  const storyText = `title: Start
---
<<declare $counter = 1>>
-> First choice
    <<set $counter to $counter + 1>>
    <<jump Next>>
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(story.variables),
    }

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedProgress.status, "auto_jump_now")
    assertEquals(selectedProgress.continueTarget, "Next")

    loadStory(story)
    handleChoiceClick(startBlock.contentNodes, 0)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(choices.value, {})
    assertEquals(storyVariables.value.get("$counter"), 2)
  })
})

Deno.test("auto-jump choice snapshots selected transcript before navigation", async () => {
  const storyText = `title: Start
---
-> First choice
    <<jump Next>>
-> Second choice
    <<jump Other>>
===
title: Next
---
Done
===
title: Other
---
Other
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    loadStory(story)

    const initialVisible = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: seenOnceSections.value,
        variables: blockEntryVariables.value,
      },
    )
    updateActiveRenderSnapshot({
      visibleNodes: initialVisible.visibleNodes.map((node) => ({
        index: startBlock.contentNodes.indexOf(node),
        variables: {},
      })),
      visibleOnceKeys: [],
    })

    handleChoiceClick(startBlock.contentNodes, 0)

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(blockHistory.value.length, 1)
    assertEquals(blockHistory.value[0].choices, { 0: 1 })
    assertEquals(
      blockHistory.value[0].renderSnapshot?.visibleNodes.map((node) =>
        node.index
      ),
      [0, 1],
    )
    assertEquals(activeRenderSnapshot.value, null)
  })
})

Deno.test("selected choice inline set updates branch visibility and final variables", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
-> Activate <<set $flag to true>>
    <<if $flag>>
        Branch sees updated flag
    <<endif>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["Branch sees updated flag"])
    assertEquals(result.finalVariables.get("$flag"), true)
  })
})

Deno.test("choice click persists inline set effects within current block", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
-> Activate <<set $flag to true>>
    <<if $flag>>
        Branch sees updated flag
    <<endif>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    loadStory(story)
    handleChoiceClick(startBlock.contentNodes, 0)

    assertEquals(choices.value, { 0: 1 })

    const branchResult = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      choices.value,
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: new Set<string>(),
        variables: blockEntryVariables.value,
      },
    )

    const texts = branchResult.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["Branch sees updated flag"])
  })
})

Deno.test("choice shortcut selects visible matching choice level", async () => {
  const storyText = `title: Start
---
-> First choice
-> Second choice
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }
    const visible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )

    assertEquals(
      getChoiceShortcutIndex(
        startBlock.contentNodes,
        visible.visibleNodes,
        {},
        "2",
      ),
      1,
    )
  })
})

Deno.test("choice shortcut ignores already selected choices", async () => {
  const storyText = `title: Start
---
-> First choice
-> Second choice
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }
    const visible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )

    assertEquals(
      getChoiceShortcutIndex(
        startBlock.contentNodes,
        visible.visibleNodes,
        { 0: 1 },
        "1",
      ),
      null,
    )
  })
})

Deno.test("choice shortcut labels use base-36 keys", () => {
  assertEquals(getChoiceShortcutLabel(1), "1")
  assertEquals(getChoiceShortcutLabel(9), "9")
  assertEquals(getChoiceShortcutLabel(10), "A")
  assertEquals(getChoiceShortcutLabel(35), "Z")
  assertEquals(getChoiceShortcutLabel(36), null)
})

Deno.test("choice shortcut accepts letters case-insensitively", async () => {
  const storyText = `title: Start
---
-> Choice 1
-> Choice 2
-> Choice 3
-> Choice 4
-> Choice 5
-> Choice 6
-> Choice 7
-> Choice 8
-> Choice 9
-> Choice 10
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }
    const visible = filterVisibleNodes(
      startBlock.contentNodes,
      {},
      {},
      context,
    )

    assertEquals(
      getChoiceShortcutIndex(
        startBlock.contentNodes,
        visible.visibleNodes,
        {},
        "a",
      ),
      9,
    )
  })
})

Deno.test("inline choice if can depend on earlier set nodes in sequence", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<set $flag to true>>
-> Visible choice <<if $flag>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const visibleChoices = result.visibleNodes
      .filter((node): node is ActionNode => node.type === "choice")
      .map((node) => node.text)

    assertEquals(visibleChoices, ["Visible choice"])
  })
})

Deno.test("inline if on text and jump nodes respects sequential variables", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<set $flag to true>>
Visible after set <<if $flag>>
<<jump Next>> <<if $flag>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)
    const jumps = result.visibleNodes
      .filter((node): node is ActionNode => node.type === "jump")
      .map((node) => node.jumpTarget)

    assertEquals(texts, ["Visible after set"])
    assertEquals(jumps, ["Next"])
  })
})

Deno.test("set command can reset a string variable to an empty string", async () => {
  const storyText = `title: Start
---
<<declare $currentTask = "checkIncidents">>
<<set $currentTask to "">>
Task was cleared <<if $currentTask == "">>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(result.finalVariables.get("$currentTask"), "")
    assertEquals(texts, ["Task was cleared"])
  })
})

Deno.test("historical detour debug artifact is hidden by default", () => {
  const node: ActionNode = {
    type: "detour",
    identionLevel: 0,
    choicePath: [],
    jumpTarget: "DebugTarget",
  }

  const rendered = renderNode(node, 0, [node], {
    choices: {},
    context: {
      visitedBlocks: new Set<string>(),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    },
    isHistorical: true,
  }, [node])

  assertEquals(rendered, [])
})

Deno.test("inline if gates set node side effects", async () => {
  const storyText = `title: Start
---
<<declare $enabled = false>>
<<declare $count = 0>>
<<set $count to $count + 1>> <<if $enabled>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Start"]),
        seenOnceSections: new Set<string>(),
        variables: new Map(story.variables),
      },
    )

    assertEquals(result.finalVariables.get("$count"), 0)
  })
})

Deno.test("nested unresolved choice blocks continue", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
    -> Nested choice
        Nested result
        <<jump Next>>
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedProgress.status, "waiting_for_choice")
    assertEquals(selectedProgress.continueTarget, null)
  })
})

Deno.test("selected branch without jump completes in place", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>(),
    }

    const selectedVisible = filterVisibleNodes(
      startBlock.contentNodes,
      { 0: 1 },
      {},
      context,
    )
    const selectedProgress = evaluateActiveBlockProgress(
      startBlock.contentNodes,
      selectedVisible.visibleNodes,
      { 0: 1 },
    )

    assertEquals(selectedProgress.status, "complete_without_continue")
    assertEquals(selectedProgress.continueTarget, null)
  })
})

Deno.test("post-detour resume stops before stale outer branch boundary", async () => {
  const storyText = `title: Laptop
---
<<if $containment > 0>>
    <<if visited("A") == false>>
        <<detour CheckContainment>>
        <<jump A>>
    <<elseif visited("B") == false>>
        <<detour CheckContainment>>
        <<jump B>>
    <<endif>>
<<endif>>
<<detour CheckEnding>>
===
title: CheckContainment
---
===
title: A
---
A reached
===
title: B
---
B reached
===
title: CheckEnding
---
Ending reached
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const laptopBlock = story.blocks.get("Laptop")

    assert(laptopBlock)

    const context = {
      visitedBlocks: new Set(["Laptop", "CheckContainment"]),
      seenOnceSections: new Set<string>(),
      variables: new Map<string, string | number | boolean>([
        ["$containment", 13],
      ]),
    }
    const initial = evaluateVisibleNodesSequentially(
      laptopBlock.contentNodes,
      {},
      {},
      context,
    )
    const initialTargets = initial.visibleNodes
      .filter((node) => node.type === "jump" || node.type === "detour")
      .map((node) => (node as ActionNode).jumpTarget)

    assertEquals(initialTargets, ["CheckContainment"])

    const firstDetourIndex = laptopBlock.contentNodes.findIndex((node) =>
      node.type === "detour" && (node as ActionNode).jumpTarget ===
        "CheckContainment"
    )
    const resumeLine = firstDetourIndex + 1
    const resumedNodes = laptopBlock.contentNodes.slice(resumeLine)

    const result = evaluateVisibleNodesSequentially(
      resumedNodes,
      {},
      {},
      context,
      {
        resumeStartIndent: laptopBlock.contentNodes[resumeLine]?.identionLevel,
      },
    )
    const progress = evaluateActiveBlockProgress(
      resumedNodes,
      result.visibleNodes,
      {},
    )

    assertEquals(progress.status, "auto_jump_now")
    assertEquals(progress.continueTarget, "A")
  })
})

Deno.test("root-level post-detour resume continues through local if blocks", async () => {
  const storyText = `title: Laptop
---
<<detour CheckEnding>>
<<if $alreadyBusy>>
    Should not show
    <<jump GetBusy>>
<<endif>>
<<if $showChoices>>
    Continue text
    -> Pick work
        <<jump Work>>
<<endif>>
===
title: CheckEnding
---
===
title: GetBusy
---
Busy
===
title: Work
---
Work
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const laptopBlock = story.blocks.get("Laptop")

    assert(laptopBlock)

    const detourIndex = laptopBlock.contentNodes.findIndex((node) =>
      node.type === "detour" && (node as ActionNode).jumpTarget ===
        "CheckEnding"
    )
    const resumeLine = detourIndex + 1
    const resumedNodes = laptopBlock.contentNodes.slice(resumeLine)
    const result = evaluateVisibleNodesSequentially(
      resumedNodes,
      {},
      {},
      {
        visitedBlocks: new Set(["Laptop", "CheckEnding"]),
        seenOnceSections: new Set<string>(),
        variables: new Map<string, string | number | boolean>([
          ["$alreadyBusy", false],
          ["$showChoices", true],
        ]),
      },
      {
        resumeStartIndent: laptopBlock.contentNodes[resumeLine]?.identionLevel,
      },
    )
    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)
    const progress = evaluateActiveBlockProgress(
      resumedNodes,
      result.visibleNodes,
      {},
    )

    assertEquals(texts, ["Continue text"])
    assertEquals(progress.status, "waiting_for_choice")
  })
})

Deno.test("post-detour resume skips stale else branch then evaluates following sibling if", async () => {
  const storyText = `title: Start
---
<<if visited("Fallback") == false>>
    <<detour Fallback>>
<<else>>
    <<detour OtherFallback>>
<<endif>>
<<if $goSpecial>>
    <<jump Special>>
<<else>>
    <<jump Normal>>
<<endif>>
===
title: Fallback
---
Fallback text
===
title: OtherFallback
---
Other fallback text
===
title: Special
---
Special reached
===
title: Normal
---
Normal reached
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const detourIndex = startBlock.contentNodes.findIndex((node) =>
      node.type === "detour" && (node as ActionNode).jumpTarget === "Fallback"
    )
    const resumeLine = detourIndex + 1
    const resumedNodes = startBlock.contentNodes.slice(resumeLine)
    const resumeOptions = {
      resumeStartIndent: startBlock.contentNodes[resumeLine]?.identionLevel,
    }

    for (
      const [goSpecial, expectedTarget] of [[true, "Special"], [
        false,
        "Normal",
      ]] as const
    ) {
      const result = evaluateVisibleNodesSequentially(
        resumedNodes,
        {},
        {},
        {
          visitedBlocks: new Set(["Start", "Fallback"]),
          seenOnceSections: new Set<string>(),
          variables: new Map<string, string | number | boolean>([
            ["$goSpecial", goSpecial],
          ]),
        },
        resumeOptions,
      )
      const progress = evaluateActiveBlockProgress(
        resumedNodes,
        result.visibleNodes,
        {},
      )

      assertEquals(progress.status, "auto_jump_now")
      assertEquals(progress.continueTarget, expectedTarget)
    }
  })
})

Deno.test("store selection does not navigate, continue executes armed jump", async () => {
  const storyText = `title: Start
---
-> First choice
    Branch line
    <<jump Next>>
===
title: Next
---
Done
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)

    assertEquals(currentBlockTitle.value, "Start")

    selectChoice(0, 1)

    assertEquals(currentBlockTitle.value, "Start")
    assertEquals(choices.value, { 0: 1 })
    assertEquals(activeBlockStatus.value, "resolving_branch")
    assertEquals(pendingContinueTarget.value, null)

    pendingContinueTarget.value = "Next"
    activeBlockStatus.value = "ready_to_continue"

    continueBranch()

    assertEquals(currentBlockTitle.value, "Next")
    assertEquals(choices.value, {})
    assertEquals(pendingContinueTarget.value, null)
    assertEquals(activeBlockStatus.value, "complete_without_continue")
  })
})

Deno.test("self-mutating else branch does not re-open earlier if, but later if sees updated value", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<if $flag>>
    First if true
<<else>>
    First else false
    <<set $flag to true>>
<<endif>>
<<if $flag>>
    Second if true
<<endif>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)
    const startBlock = story.blocks.get("Start")

    assert(startBlock)

    const context = {
      visitedBlocks: new Set(["Start"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(story.variables),
    }

    const result = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      context,
    )

    const texts = result.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["First else false", "Second if true"])
    assertEquals(result.finalVariables.get("$flag"), true)
    assert(!texts.includes("First if true"))
  })
})

Deno.test("re-entered block re-evaluates first if from updated variable state", async () => {
  const storyText = `title: Start
---
<<declare $flag = false>>
<<if $flag>>
    First if true
<<else>>
    First else false
    <<set $flag to true>>
<<endif>>
<<jump Next>>
===
title: Next
---
<<jump Start>>
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)

    const startBlock = story.blocks.get("Start")
    assert(startBlock)

    const firstPass = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: new Set<string>(),
        variables: blockEntryVariables.value,
      },
    )

    applyVariables(firstPass.finalVariables)

    const reentryContext = {
      visitedBlocks: new Set(["Start", "Next"]),
      seenOnceSections: new Set<string>(),
      variables: new Map(storyVariables.value),
    }

    const reentered = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      reentryContext,
    )

    const texts = reentered.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(texts, ["First if true"])
  })
})

Deno.test("once section is consumed before automatic detour navigation", async () => {
  const storyText = `title: Start
---
<<once>>
    Intro once
<<endonce>>
<<detour Check>>
<<jump Start>>
===
title: Check
---
Checked
===
`

  await withTempStory(storyText, async (path) => {
    const story = await parseStory(path)

    loadStory(story)

    const startBlock = story.blocks.get("Start")
    assert(startBlock)

    const firstPass = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: seenOnceSections.value,
        variables: blockEntryVariables.value,
      },
    )

    const firstTexts = firstPass.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(firstTexts, ["Intro once"])
    assertEquals([...firstPass.visibleOnceKeys], ["Start:2"])

    visibleOnceSections.value = new Set(firstPass.visibleOnceKeys)
    navigateToDetour("Check", {
      title: "Start",
      line: 4,
      choices: {},
      randomChoices: {},
    })

    assertEquals([...seenOnceSections.value], ["Start:2"])
    assertEquals([...visibleOnceSections.value], [])

    const revisited = evaluateVisibleNodesSequentially(
      startBlock.contentNodes,
      {},
      {},
      {
        visitedBlocks: visitedBlocks.value,
        seenOnceSections: seenOnceSections.value,
        variables: blockEntryVariables.value,
      },
    )

    const revisitedTexts = revisited.visibleNodes
      .filter((node): node is TextNode => node.type === "text")
      .map((node) => node.text)

    assertEquals(revisitedTexts, [])
  })
})
