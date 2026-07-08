import ThemeToggle from "@/islands/ThemeToggle.tsx"

export function Header() {
  return (
    <header class="theme-header sticky top-0 z-20">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-header-muted">
            Yarn Storyteller
          </p>
          <h1 class="truncate text-lg font-semibold text-header sm:text-xl">
            Restlicht
          </h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
