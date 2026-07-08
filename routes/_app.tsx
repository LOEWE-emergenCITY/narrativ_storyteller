import { define } from "../utils.ts"

const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const storageKey = "storyteller-theme"
  const savedTheme = globalThis.localStorage?.getItem(storageKey)
  const systemPrefersDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)")
    ?.matches
  const theme = savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : systemPrefersDark
    ? "dark"
    : "light"

  document.documentElement.dataset.theme = theme
})()`

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Yarn Storyteller</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body class="bg-app-bg text-theme">
        <Component />
      </body>
    </html>
  )
})
