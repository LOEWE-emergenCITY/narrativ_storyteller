import type { ComponentChildren } from "preact"
import clsx from "clsx"

export interface ChatProps {
  children?: ComponentChildren
  isAngela?: boolean
  sender: string
}

export function Chat(props: ChatProps) {
  return (
    <div
      class={clsx(
        `flex flex-col`,
        props.isAngela ? "items-end" : "items-start",
        "w-full px-4 py-2 mb-4",
      )}
    >
      <div
        class={clsx(
          "flex flex-col",
          props.isAngela ? "items-end" : "items-start",
        )}
      >
        <div
          class={clsx(
            "py-1 border rounded-md px-2 border-gray-300 max-w-[70%] bg-opacity-60 shadow-sm",
            props.isAngela ? "bg-[#f2f2f2]" : "bg-[#5f2869] text-white ",
          )}
        >
          {props.children}
          <div
            class={clsx(
              "text-sm font-serif -mt-4 text-right pe-1",
              props.isAngela
                ? "text-right pe-1 text-gray-500"
                : "text-left ps-1 text-white/70",
            )}
          >
            {`${props.sender}`}
          </div>
        </div>
      </div>
    </div>
  )
}
