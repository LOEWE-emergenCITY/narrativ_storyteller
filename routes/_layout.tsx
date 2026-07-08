import { define } from "@/utils.ts"
import { Header } from "@/components/Header.tsx"

export default define.page(function Layout({ Component }) {
  return (
    <div class="min-h-screen bg-app-bg text-theme">
      <Header />
      <main>
        <Component />
      </main>
    </div>
  )
})
