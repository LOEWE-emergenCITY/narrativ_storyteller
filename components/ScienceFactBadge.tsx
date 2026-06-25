import { Lightbulb } from "lucide-preact"
import { scienceFacts } from "@/utils/storyStore.ts"

export interface ScienceFactProps {
  name: string
}

export function ScienceFactBadge(props: ScienceFactProps) {
  const href = scienceFacts.value[props.name]

  if (!href) {
    return (
      <div class="flex w-full py-1 px-4 justify-start">
        <div class="flex w-full p-2 border-yellow-600 border-2 rounded-sm bg-yellow-100 shadow-sm gap-2 text-yellow-900">
          ScienceFact '{props.name}' not found
        </div>
      </div>
    )
  }

  return (
    <div class="flex w-full py-1 px-4 justify-end">
      <a
        class="flex max-w-md p-2 border-emerald-800 border-2 rounded-full bg-emerald-200 shadow-sm gap-1 hover:bg-emerald-300"
        href={href}
        target="_blank"
      >
        <Lightbulb class="text-emerald-800" />
        ScienceFact
      </a>
    </div>
  )
}
