import type { ComponentChildren } from "preact"
import { clsx } from "clsx"
import { renderHTML } from "@/utils/customHooks.ts"
import {
  activateGlow,
  clearGlow,
  updateGlowPosition,
} from "@/utils/buttonGlow.ts"
import {
  ArrowBigDownDash,
  CornerDownRight,
  CornerUpLeft,
  RotateCcw,
} from "lucide-preact"

export interface ButtonProps {
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
  className?: string
  choiceId?: string
  html?: string
}

export function Button(
  props: ButtonProps,
) {
  const sanitized = renderHTML(props.html ? props.html : "")

  return (
    <div class={clsx("w-full py-1 px-4 justify-start flex", props.className)}>
      <button
        {...props}
        onPointerEnter={activateGlow}
        onPointerMove={updateGlowPosition}
        onPointerLeave={clearGlow}
        class={clsx(
          "interactive-glow px-2 py-4 text-start flex items-center",
          "w-full rounded-sm border-2 border-theme-strong bg-surface text-theme shadow-sm",
          props.disabled
            ? "opacity-60"
            : "transition-colors hover:bg-surface-strong",
        )}
      >
        <span class="interactive-glow__content flex items-center w-full">
          {props.choiceId && (
            <div
              class={clsx(
                "rounded-sm border-2 border-theme-strong",
                "text-3xl font-bold flex text-accent",
                "items-center justify-center size-9 me-4 px-2",
              )}
            >
              {props.choiceId}
            </div>
          )}
          {props.html
            // deno-lint-ignore react-no-danger
            ? <div dangerouslySetInnerHTML={{ __html: sanitized }} />
            : props.children}
        </span>
      </button>
    </div>
  )
}

export function ContinueButton(
  props: { onClick?: () => void; disabled?: boolean; className?: string },
) {
  return (
    <div class={clsx("w-full py-1 px-4 justify-center flex", props.className)}>
      <button
        {...props}
        onPointerEnter={activateGlow}
        onPointerMove={updateGlowPosition}
        onPointerLeave={clearGlow}
        class={clsx(
          "interactive-glow flex w-32 items-center justify-center rounded-sm border-2 border-theme-strong bg-surface p-2 text-accent shadow-sm",
          props.disabled
            ? "opacity-60"
            : "transition-colors hover:bg-surface-strong",
        )}
      >
        <span class="interactive-glow__content">
          <ArrowBigDownDash class="size-10" />
        </span>
      </button>
    </div>
  )
}

/** Button shown when the story is about to enter a detour block. */
export function DetourButton(
  props: { onClick?: () => void; disabled?: boolean; className?: string },
) {
  return (
    <div class={clsx("w-full py-1 px-4 justify-center flex", props.className)}>
      <button
        {...props}
        onPointerEnter={activateGlow}
        onPointerMove={updateGlowPosition}
        onPointerLeave={clearGlow}
        class={clsx(
          "interactive-glow flex w-32 items-center justify-center rounded-sm border-2 border-theme-strong bg-surface p-2 text-accent shadow-sm",
          props.disabled
            ? "opacity-60"
            : "transition-colors hover:bg-surface-strong",
        )}
      >
        <span class="interactive-glow__content">
          <CornerDownRight class="size-10" />
        </span>
      </button>
    </div>
  )
}

/** Button shown when a detour block ends and the story can return to its origin. */
export function ReturnFromDetourButton(
  props: { onClick?: () => void; disabled?: boolean; className?: string },
) {
  return (
    <div class={clsx("w-full py-1 px-4 justify-center flex", props.className)}>
      <button
        {...props}
        onPointerEnter={activateGlow}
        onPointerMove={updateGlowPosition}
        onPointerLeave={clearGlow}
        class={clsx(
          "interactive-glow flex w-32 items-center justify-center rounded-sm border-2 border-theme-strong bg-surface p-2 text-accent shadow-sm",
          props.disabled
            ? "opacity-60"
            : "transition-colors hover:bg-surface-strong",
        )}
      >
        <span class="interactive-glow__content">
          <CornerUpLeft class="size-10" />
        </span>
      </button>
    </div>
  )
}

/** Button shown after the End block has finished evaluating. */
export function RestartButton(
  props: { onClick?: () => void; disabled?: boolean; className?: string },
) {
  return (
    <div class={clsx("w-full py-1 px-4 justify-center flex", props.className)}>
      <button
        {...props}
        type="button"
        onPointerEnter={activateGlow}
        onPointerMove={updateGlowPosition}
        onPointerLeave={clearGlow}
        class={clsx(
          "interactive-glow flex items-center justify-center gap-2 rounded-sm border-2 border-theme-strong bg-surface p-3 text-accent shadow-sm",
          props.disabled
            ? "opacity-60"
            : "transition-colors hover:bg-surface-strong",
        )}
      >
        <span class="interactive-glow__content flex items-center gap-2">
          <RotateCcw class="size-5" />
          Nochmal! Aber anders.
        </span>
      </button>
    </div>
  )
}
