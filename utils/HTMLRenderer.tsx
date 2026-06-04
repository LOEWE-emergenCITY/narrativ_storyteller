// HTMLRenderer.tsx

import { useHTMLRenderer } from "@/utils/customHooks.ts"

interface Props {
  html: string
}
export function HTMLRenderer({ html }: Props) {
  const sanitized = useHTMLRenderer(html)

  // deno-lint-ignore react-no-danger
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
}
