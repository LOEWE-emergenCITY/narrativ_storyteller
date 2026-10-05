import { renderHTML } from "@/utils/customHooks.ts"

export interface ChoiceTranscriptProps {
  html?: string
  variables?: Map<string, string | number | boolean>
}

/**
 * Read-only record of a choice that was made in a historical block.
 * Styled with a left accent border so it is visually distinct from
 * plain narration text while being clearly non-interactive.
 */
export function ChoiceTranscript(props: ChoiceTranscriptProps) {
  const preparedText = renderHTML(props.html ?? "", props.variables)

  return (
    <div class="w-full py-1 px-4">
      <div
        class="story-reading rounded-sm border-l-4 border-accent bg-surface-strong px-3 py-2 italic text-theme-muted"
        // deno-lint-ignore react-no-danger
        dangerouslySetInnerHTML={{ __html: preparedText }}
      />
    </div>
  )
}
