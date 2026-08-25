import { define } from "@/utils.ts"
import { Header } from "@/components/Header.tsx"

export default define.page(() => {
  return (
    <>
      <Header />
      <main class="mx-auto flex min-h-[calc(100dvh-var(--app-header-height)-var(--app-footer-height))] max-w-3xl flex-col gap-4 bg-app-bg px-4 py-8 text-theme">
        <h1 class="text-3xl font-bold">About</h1>
        <p>
          Hier könnte Ihre Werbung stehen. Oder auch nicht. Das hier ist die
          About-Seite.
        </p>
      </main>
    </>
  )
})
