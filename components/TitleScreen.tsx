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
  debugMode?: boolean
  debugPath?: string
  debugPathError?: string | null
  onDebugPathChange?: (value: string) => void
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
        "interactive-glow interactive-glow--title w-full rounded-md border px-5 py-3 text-center text-lg sm:py-4 sm:text-xl",
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
  {
    isReady,
    canContinue,
    onStart,
    onContinue,
    debugMode = false,
    debugPath = "",
    debugPathError = null,
    onDebugPathChange,
  }: TitleScreenProps,
) {
  const titleStackRatio = canContinue ? "aspect-[8/7]" : "aspect-[8/6]"

  return (
    <div class="h-[calc(100dvh-var(--app-header-height)-var(--app-footer-height))] overflow-hidden bg-app-bg p-2 text-theme sm:p-3">
      <div class="flex h-full min-h-0 items-center justify-center">
        <div
          class={clsx(
            "mx-auto flex h-full max-h-full w-auto max-w-full min-w-0 flex-col gap-1 sm:gap-2",
            titleStackRatio,
          )}
        >
          <div class="aspect-[8/5] w-full min-w-0 shrink-0">
            <img
              src="/scenes/eHub_restlicht_titelbild.jpg"
              alt="Restlicht Title Bild"
              class="block h-full w-full object-contain"
            />
          </div>

          <div class="w-full shrink-0 min-w-0">
            {isReady
              ? (
                <div class="grid w-full grid-cols-1 gap-2 sm:gap-3">
                  <TitleActionButton onClick={onStart}>
                    Start
                  </TitleActionButton>
                  {debugMode && (
                    <div class="rounded-md border border-theme bg-surface p-3 text-left">
                      <label
                        class="block text-xs uppercase tracking-[0.2em] text-theme-muted"
                        htmlFor="debug-path"
                      >
                        Debug-Pfad
                      </label>
                      <input
                        id="debug-path"
                        value={debugPath}
                        onInput={(event) =>
                          onDebugPathChange?.(event.currentTarget.value)}
                        placeholder="1212----A-3"
                        class="mt-2 w-full rounded-md border border-theme-strong bg-app-bg px-3 py-2 text-theme outline-none focus:ring-2 focus:ring-accent"
                      />
                      {debugPathError && (
                        <p class="mt-2 text-sm text-red-300">
                          {debugPathError}
                        </p>
                      )}
                    </div>
                  )}
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
    </div>
  )
}
