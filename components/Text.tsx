import type { ComponentChildren } from "preact"
import clsx from "clsx"

export interface TextProps {
  children?: ComponentChildren
  className?: string
}

export function Text(props: TextProps) {
  return (
    <p class={clsx("text-lg text-left py-2 px-4", props.className)}>
      {props.children}
    </p>
  )
}
