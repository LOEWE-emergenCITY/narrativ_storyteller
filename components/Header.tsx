import ThemeToggle from "@/islands/ThemeToggle.tsx"

export interface HeaderProps {
  versionLabel?: string
}

export function Header({ versionLabel }: HeaderProps) {
  return (
    <header class="sticky top-0 z-20 h-[var(--app-header-height)] bg-app-bg/70 text-header backdrop-blur-sm">
      <div class="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-3 sm:px-4">
        <div class="min-w-0 truncate text-sm font-medium tracking-[0.02em] sm:text-base">
          <span>Restlicht</span>
          {versionLabel && (
            <span class="text-header-muted">
              {" · "}
              <span class="align-baseline text-[0.72rem] font-normal sm:text-xs">
                {versionLabel}
              </span>
            </span>
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
