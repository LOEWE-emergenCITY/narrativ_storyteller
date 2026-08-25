import ThemeToggle from "@/islands/ThemeToggle.tsx"

export interface HeaderProps {
  versionLabel?: string
}

export function Header({ versionLabel }: HeaderProps) {
  return (
    <header class="sticky top-0 z-20 h-[var(--app-header-height)] bg-app-bg/70 text-header backdrop-blur-sm">
      <div class="mx-auto flex h-full max-w-5xl items-center justify-between gap-3 px-3 sm:px-4 pt-1">
        <div class="min-w-0 truncate text-sm font-medium tracking-[0.02em] sm:text-base items-center">
          <span>Restlicht</span>
          {versionLabel && (
            <span class="ps-1 text-[0.72rem] text-header-muted font-normal sm:text-xs">
              {versionLabel}
            </span>
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
