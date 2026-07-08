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
    <label class="flex items-center gap-3 text-sm text-header">
      <span class="hidden text-header-muted sm:inline">Theme</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        onClick={() => updateTheme(isDark ? "light" : "dark")}
        class="flex items-center gap-2 rounded-full border border-header bg-surface px-3 py-2 text-sm text-theme shadow-sm transition-colors hover:bg-surface-strong focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {isDark ? <Moon class="size-4" /> : <Sun class="size-4" />}
        <span>{isDark ? "Dark" : "Light"}</span>
      </button>
    </label>
  )
}
