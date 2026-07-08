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
        "w-full rounded-lg border px-5 py-3 text-center text-lg shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:py-4 sm:text-xl",
        "bg-linear-to-b transition-[background-color,border-color,box-shadow,transform] duration-200",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app-bg",
        "hover:-translate-y-px",
        secondary
          ? "border-theme from-surface-strong to-surface-muted text-theme hover:border-theme-strong hover:brightness-110 hover:shadow-[0_14px_32px_rgba(77,88,128,0.2)]"
          : "border-theme-strong from-accent to-surface text-accent-contrast hover:brightness-110 hover:shadow-[0_16px_36px_rgba(98,83,156,0.26)]",
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
    <div class="min-h-[calc(100vh-4.5rem)] overflow-hidden bg-app-bg p-2 text-theme sm:p-3">
      <div class="mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col gap-2 sm:gap-3">
        <div class="flex-1 min-h-0 rounded-lg border border-theme bg-surface p-2 shadow-[0_16px_60px_rgba(0,0,0,0.45)] sm:p-3">
          <img
            src="/scenes/eHub_restlicht_title.jpg"
            alt="Restlicht Title Bild"
            class="h-full w-full rounded-md bg-surface-strong object-contain"
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
              <div class="flex w-full items-center justify-center gap-3 rounded-md border border-theme bg-surface px-4 py-3 text-sm uppercase tracking-[0.3em] text-theme-muted sm:px-5 sm:py-4">
                <span class="inline-block size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
