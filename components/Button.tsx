import type { ComponentChildren } from "preact"
import { clsx } from "clsx"

export interface ButtonProps {
  id?: string
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
  className?: string
  choiceId?: string
}

export function Button(props: ButtonProps) {
  return (
    <div class={clsx("w-full py-1 px-4 justify-start flex", props.className)}>
      <button
        {...props}
        class={clsx(
          "px-2 py-4 text-start flex items-center",
          "border-[#b3c6c6] border-2 rounded-sm bg-white hover:bg-gray-200 transition-colors w-full",
        )}
      >
        <div
          class={clsx(
            "rounded-sm border-2 border-[#b3c6c6]",
            "text-3xl font-bold flex text-[#b3c6c6]",
            "items-center justify-center size-9 me-4",
          )}
        >
          {props.choiceId}
        </div>
        {props.children}
      </button>
    </div>
  )
}
