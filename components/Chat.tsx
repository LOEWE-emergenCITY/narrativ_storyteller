import type { ComponentChildren } from "preact"
import clsx from "clsx"

export interface ChatProps {
  children?: ComponentChildren
  isSender?: boolean
  isReceiver?: boolean
}

export function Chat(props: ChatProps) {
  return (
    <div
      class={clsx(
        `flex`,
        props.isSender && "justify-end",
        props.isReceiver && "justify-start",
        "w-full px-4 py-2",
      )}
    >
      <div
        class={clsx(
          "py-1 border rounded-sm px-2 border-gray-300 max-w-[70%]",
          props.isSender && "bg-[#f2f2f2] text-right",
          props.isReceiver && "bg-[#5f2869] text-white",
        )}
      >
        {props.children}
      </div>
    </div>
  )
}
