import { define } from "@/utils.ts"

export default define.page(() => {
  return (
    <main class="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-3xl flex-col gap-4 bg-app-bg px-4 py-8 text-theme">
      <h1 class="text-3xl font-bold">About</h1>
      <p>
        Hier könnte Ihre Werbung stehen. Oder auch nicht. Das hier ist die
        About-Seite.
      </p>
    </main>
  )
})
