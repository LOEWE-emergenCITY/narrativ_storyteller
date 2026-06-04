import type { ComponentChildren } from "preact"
import clsx from "clsx"
import { HTMLRenderer } from "../utils/HTMLRenderer.tsx"

export interface TextProps {
  children?: ComponentChildren
  className?: string
  html?: string
}

export function Text(props: TextProps) {
  return (
    <p class={clsx("text-lg text-left py-2 px-4", props.className)}>
      {props.html ? <HTMLRenderer html={props.html} /> : props.children}
    </p>
  )
}
