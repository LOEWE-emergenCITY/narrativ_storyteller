;(() => {
  const storageKey = "storyteller-theme"
  const savedTheme = globalThis.localStorage?.getItem(storageKey)
  const systemPrefersDark = globalThis.matchMedia?.(
    "(prefers-color-scheme: dark)",
  )
    ?.matches
  const theme = savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : systemPrefersDark
    ? "dark"
    : "light"

  document.documentElement.dataset.theme = theme
})()
