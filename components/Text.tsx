import type { ComponentChildren } from "preact"
import clsx from "clsx"
import { interpolateVariables, renderHTML } from "@/utils/customHooks.ts"

export interface TextProps {
  children?: ComponentChildren
  className?: string
  html?: string
  variables?: Map<string, string | number | boolean>
}

export function Text(props: TextProps) {
  const renderedHtml = renderHTML(props.html ?? "", props.variables)
  const preparedText = props.html
    ? renderedHtml
    : interpolateVariables(String(props.children), props.variables)

  if (props.html) {
    return (
      <div
        // deno-lint-ignore react-no-danger
        dangerouslySetInnerHTML={{ __html: preparedText }}
        class={clsx("text-lg text-left py-2 px-4", props.className)}
      />
    )
  }

  return (
    <p class={clsx("text-lg text-left py-2 px-4", props.className)}>
      {preparedText}
    </p>
  )
}
