import type { ComponentChildren } from "preact"
import { clsx } from "clsx"
import { useHTMLRenderer } from "@/utils/customHooks.ts"

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
          "border-[#b3c6c6] border-2 rounded-sm bg-white hover:bg-gray-200 transition-colors w-full shadow-sm",
        )}
      >
        <div
          class={clsx(
            "rounded-sm border-2 border-[#b3c6c6]",
            "text-3xl font-bold flex text-[#b3c6c6]",
            "items-center justify-center size-9 me-4 px-2",
          )}
        >
          {props.choiceId}
        </div>
        {props.html
          // deno-lint-ignore react-no-danger
          ? <div dangerouslySetInnerHTML={{ __html: sanitized }} />
          : props.children}
      </button>
    </div>
  )
}
