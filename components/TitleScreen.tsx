import clsx from "clsx/lite"
import {
  activateGlow,
  clearGlow,
  updateGlowPosition,
} from "@/utils/buttonGlow.ts"

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
      onPointerEnter={activateGlow}
      onPointerMove={updateGlowPosition}
      onPointerLeave={clearGlow}
      class={clsx(
        "interactive-glow interactive-glow--title w-full rounded-lg border px-5 py-3 text-center text-lg shadow-sm sm:py-4 sm:text-xl",
        "bg-linear-to-b transition-[background-color,border-color,box-shadow,transform] duration-200",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app-bg",
        secondary
          ? "border-theme from-surface-strong to-surface-muted text-theme"
          : clsx(
            "border-theme-strong from-[color:color-mix(in_srgb,var(--accent)_28%,transparent)] to-surface text-theme",
            "text-accent",
          ),
      )}
    >
      <span class="interactive-glow__content">
        {children}
      </span>
    </button>
  )
}

export function TitleScreen(
  { isReady, canContinue, onStart, onContinue }: TitleScreenProps,
) {
  return (
    <div class="h-[calc(100dvh-var(--app-header-height)-var(--app-footer-height))] overflow-hidden bg-app-bg p-2 text-theme sm:p-3">
      <div class="mx-auto grid h-full w-full max-w-5xl grid-rows-[minmax(0,1fr)_auto] gap-2 sm:gap-3">
        <div class="flex-1 min-h-0 rounded-lg border border-theme bg-surface p-2 shadow-md sm:p-3">
          <img
            src="/scenes/eHub_restlicht_titelbild.jpg"
            alt="Restlicht Title Bild"
            class="h-full w-full rounded-md bg-surface-strong object-contain"
          />
        </div>

        <div class="w-full shrink-0 min-w-0">
          {isReady
            ? (
              <div class="grid w-full grid-cols-1 gap-2 sm:gap-3">
                <TitleActionButton onClick={onStart}>
                  Start
                </TitleActionButton>
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
