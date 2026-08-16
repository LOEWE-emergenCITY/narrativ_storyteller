import { define } from "@/utils.ts"
import { Footer } from "@/components/Footer.tsx"

export default define.page(function Layout({ Component }) {
  return (
    <div class="min-h-screen bg-app-bg text-theme">
      <Component />
      <Footer />
    </div>
  )
})
