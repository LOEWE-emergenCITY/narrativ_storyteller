import clsx from "clsx/lite"
import { Moon, Sun } from "lucide-preact"
import { useEffect, useState } from "preact/hooks"

const STORAGE_KEY = "storyteller-theme"

type Theme = "light" | "dark"

function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark"
}

function getResolvedTheme(): Theme {
  const currentTheme = document.documentElement.dataset.theme
  if (isTheme(currentTheme)) return currentTheme

  return globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light"
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    setTheme(getResolvedTheme())
  }, [])

  function updateTheme(nextTheme: Theme) {
    document.documentElement.dataset.theme = nextTheme
    globalThis.localStorage?.setItem(STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
  }

  const isDark = theme === "dark"

  return (
    <div class="flex items-center gap-3 text-sm text-header">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        onClick={() => updateTheme(isDark ? "light" : "dark")}
        class={clsx(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-[background-color,border-color,box-shadow] duration-200",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app-bg",
          isDark
            ? "border-accent bg-accent shadow-[0_8px_20px_rgba(98,83,156,0.28)]"
            : "border-theme-strong bg-surface-strong shadow-sm",
        )}
      >
        <span
          h-8
          w-14
          class={clsx(
            "pointer-events-none absolute left-1.5 text-theme-muted transition-opacity duration-200",
            isDark ? "opacity-0" : "opacity-100",
          )}
        >
          <Sun class="size-3.5" />
        </span>
        <span
          class={clsx(
            "pointer-events-none absolute right-1.5 text-accent-contrast transition-opacity duration-200",
            isDark ? "opacity-100" : "opacity-0",
          )}
        >
          <Moon class="size-3.5" />
        </span>
        <span
          class={clsx(
            "pointer-events-none inline-flex size-6 transform items-center justify-center rounded-full bg-surface text-theme shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-transform duration-200",
            isDark ? "translate-x-7" : "translate-x-1",
          )}
        >
          {isDark ? <Moon class="size-3.5" /> : <Sun class="size-3.5" />}
        </span>
      </button>
    </div>
  )
}
