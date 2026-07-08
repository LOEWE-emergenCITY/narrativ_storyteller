import ThemeToggle from "@/islands/ThemeToggle.tsx"

export function Header() {
  return (
    <header class="theme-header sticky top-0 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3">
        <div class="min-w-0">
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-header-muted">
            Yarn Storyteller
          </p>
          <h1 class="truncate text-base font-semibold tracking-[0.02em] text-header sm:text-lg">
            Restlicht
          </h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
