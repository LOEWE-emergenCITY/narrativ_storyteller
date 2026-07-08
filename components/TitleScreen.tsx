import clsx from "clsx/lite"

export interface TitleScreenProps {
  isReady: boolean
  canContinue: boolean
  onStart: () => void
  onContinue: () => void
}

type TitleActionButtonProps = {
  onClick: () => void
  children: string
  secondary?: boolean
}

function TitleActionButton(
  { onClick, children, secondary = false }: TitleActionButtonProps,
) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={clsx(
        "w-full rounded-lg border px-5 py-3 text-center text-lg text-[#f6f4ff] shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:py-4 sm:text-xl",
        "bg-linear-to-b transition-[background-color,border-color,box-shadow,transform] duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[#8d79c9] focus:ring-offset-2 focus:ring-offset-[#0a0b10]",
        "hover:-translate-y-px",
        secondary
          ? "border-[#323a54] from-[#171c2b] to-[#141a28] hover:border-[#465071] hover:from-[#1c2334] hover:to-[#181f2e] hover:shadow-[0_14px_32px_rgba(77,88,128,0.2)]"
          : "border-[#445176] from-[#2d3650] to-[#252d43] hover:border-[#5b6b95] hover:from-[#35405d] hover:to-[#2b334b] hover:shadow-[0_16px_36px_rgba(98,83,156,0.26)]",
      )}
    >
      {children}
    </button>
  )
}

export function TitleScreen(
  { isReady, canContinue, onStart, onContinue }: TitleScreenProps,
) {
  return (
    <div class="h-screen overflow-hidden bg-[#0a0b10] p-2 sm:p-3">
      <div class="mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col gap-2 sm:gap-3">
        <div class="flex-1 min-h-0 rounded-lg border border-[#2a3147] bg-[#121624] p-2 shadow-[0_16px_60px_rgba(0,0,0,0.45)] sm:p-3">
          <img
            src="/scenes/eHub_restlicht_title.jpg"
            alt="Restlicht Title Bild"
            class="h-full w-full rounded-md bg-[#05060b] object-contain"
          />
        </div>

        <div class="w-full shrink-0 min-w-0">
          {isReady
            ? (
              <div class="grid w-full grid-cols-1 gap-2 sm:gap-3">
                <TitleActionButton onClick={onStart}>Start</TitleActionButton>
                {canContinue && (
                  <TitleActionButton onClick={onContinue} secondary>
                    Continue
                  </TitleActionButton>
                )}
              </div>
            )
            : (
              <div class="flex w-full items-center justify-center gap-3 rounded-md border border-[#2a3147] bg-[#121624] px-4 py-3 text-sm uppercase tracking-[0.3em] text-[#d9dcef] sm:px-5 sm:py-4">
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-[#8d79c9] border-t-transparent" />
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
