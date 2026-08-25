import { define } from "../utils.ts"

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Yarn Storyteller</title>
        <script src="/theme-bootstrap.js" />
      </head>
      <body class="bg-app-bg text-theme">
        <Component />
      </body>
    </html>
  )
})
