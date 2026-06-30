import type { ComponentChildren } from "preact"
import { clsx } from "clsx"
import { useHTMLRenderer } from "@/utils/customHooks.ts"
import { ArrowBigRightDash } from "lucide-preact"

export interface ButtonProps {
  id?: string
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
  className?: string
  choiceId?: string
  html?: string
}

export function Button(props: ButtonProps) {
  const sanitized = useHTMLRenderer(props.html ? props.html : "")

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
        <div
          class={clsx(
            "rounded-sm border-2 border-[#b3c6c6]",
            "text-3xl font-bold flex text-[#b3c6c6]",
            "items-center justify-center size-9 me-4 px-2",
          )}
        >
          {props.choiceId ? props.choiceId : (
            <div class="size-6">
              <ArrowBigRightDash />
            </div>
          )}
        </div>
        {props.html
          // deno-lint-ignore react-no-danger
          ? <div dangerouslySetInnerHTML={{ __html: sanitized }} />
          : props.children}
      </button>
    </div>
  )
}
