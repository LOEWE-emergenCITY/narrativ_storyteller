import type { ComponentChildren } from "preact"
import clsx from "clsx"
import { useHTMLRenderer } from "@/utils/customHooks.ts"

export interface TextProps {
  children?: ComponentChildren
  className?: string
  html?: string
}

export function Text(props: TextProps) {
  const sanitized = useHTMLRenderer(props.html ? props.html : "")

  if (props.html) {
    return (
      <div
        // deno-lint-ignore react-no-danger
        dangerouslySetInnerHTML={{ __html: sanitized }}
        class={clsx("text-lg text-left py-2 px-4", props.className)}
      />
    )
  }

  return (
    <p class={clsx("text-lg text-left py-2 px-4", props.className)}>
      props.children
    </p>
  )
}
