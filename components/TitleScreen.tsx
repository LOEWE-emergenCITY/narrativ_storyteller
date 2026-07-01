import { Button } from "@/components/Button.tsx"

export interface TitleScreenProps {
  isReady: boolean
  onStart: () => void
  onImageLoad: () => void
}

export function TitleScreen(
  { isReady, onStart, onImageLoad }: TitleScreenProps,
) {
  return (
    <div class="min-h-screen flex justify-center px-4 py-6">
      <div class="w-full rounded-2xl overflow-hidden gap-2 flex flex-col">
        <img
          src="/scenes/eHub_restlicht_title.jpg"
          alt="Restlicht title screen"
          class="w-full h-auto block"
          onLoad={onImageLoad}
        />
        {isReady
          ? (
            <div class="w-full flex gap-2">
              <Button
                onClick={onStart}
                disabled={!isReady}
              >
                Start
              </Button>
              <Button disabled>
                Continue
              </Button>
            </div>
          )
          : (
            <div class="flex items-center gap-3 text-sm uppercase justify-center tracking-[0.3em]">
              <span class="inline-block size-5 animate-spin rounded-full border-2" />
              <span>Loading story</span>
            </div>
          )}
      </div>
    </div>
  )
}
