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
          "max-w-[70%]",
        )}
      >
        <div
          class={clsx(
            "inline-block wrap-break-words rounded-md border border-theme px-2 py-1 shadow-sm",
            props.isAngela
              ? "bg-chat-self text-chat-self"
              : "bg-chat-other text-chat-other",
          )}
        >
          {props.children}
          <div
            class={clsx(
              "text-sm font-serif",
              props.isAngela
                ? "text-right text-chat-self-muted"
                : "text-left text-chat-other-muted",
            )}
          >
            {`${props.sender}`}
          </div>
        </div>
      </div>
    </div>
  )
}
