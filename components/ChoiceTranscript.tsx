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
        class="border-l-4 border-[#b3c6c6] bg-[#f0f5f5] px-3 py-2 text-gray-500 italic rounded-sm"
        // deno-lint-ignore react-no-danger
        dangerouslySetInnerHTML={{ __html: preparedText }}
      />
    </div>
  )
}
