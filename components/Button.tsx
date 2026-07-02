import type { ComponentChildren } from "preact"
import { clsx } from "clsx"
import { renderHTML } from "@/utils/customHooks.ts"
import { ArrowBigDownDash } from "lucide-preact"

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
        class={clsx(
          "px-2 py-4 text-start flex items-center",
          "border-[#b3c6c6] border-2 rounded-sm bg-white w-full shadow-sm",
          props.disabled ? "opacity-60" : "hover:bg-gray-200 transition-colors",
        )}
      >
        {props.choiceId && (
          <div
            class={clsx(
              "rounded-sm border-2 border-[#b3c6c6]",
              "text-3xl font-bold flex text-[#b3c6c6]",
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
        class={clsx(
          "w-32 p-2 justify-center flex items-center text-[#b3c6c6]",
          "border-[#b3c6c6] border-2 rounded-sm bg-white shadow-sm",
          props.disabled ? "opacity-60" : "hover:bg-gray-200 transition-colors",
        )}
      >
        <ArrowBigDownDash class="size-10" />
      </button>
    </div>
  )
}
