import { Lightbulb } from "lucide-preact"
import clsx from "clsx/lite"
import { scienceFacts } from "@/utils/storyStore.ts"

export interface ScienceFactProps {
  name: string
}

export function ScienceFactBadge(props: ScienceFactProps) {
  const href = scienceFacts.value[props.name]

  if (!href) {
    return (
      <div class="flex w-full py-1 px-4 justify-start">
        <div class="flex w-full gap-2 rounded-sm border-2 border-science-fact-missing bg-science-fact-missing p-2 text-science-fact-missing shadow-sm">
          ScienceFact '{props.name}' not found
        </div>
      </div>
    )
  }

  return (
    <div class="flex w-full py-1 px-4 justify-end">
      <a
        class={clsx(
          "flex max-w-md gap-1 rounded-full border-2 p-2 shadow-sm transition-colors",
          "border-science-fact bg-science-fact text-science-fact",
          "hover:bg-science-fact-hover",
        )}
        href={href}
        target="_blank"
      >
        <Lightbulb class="text-science-fact-icon" />
        ScienceFact
      </a>
    </div>
  )
}
