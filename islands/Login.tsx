import { useEffect, useState } from "preact/hooks"
import { Story } from "@/utils/storyTypes.tsx"
import StoryViewer from "@/islands/StoryViewer.tsx"
import {
  isLoggedIn,
  loadStory,
  persistStore,
  resetProgress,
} from "@/utils/storyStore.ts"

function Login({ initialStory }: { initialStory: Story }) {
  const [password, setPassword] = useState("")

  // FIX 1 (blank screen for returning users): always call loadStory on mount
  // so storyBlocks is populated and saved variables are merged from the yarn
  // file. isLoggedIn may already be true from localStorage, which would render
  // StoryViewer immediately — loadStory ensures it has a consistent store state.
  useEffect(() => {
    loadStory(initialStory)
  }, [])

  const handleSubmit = (e: Event) => {
    e.preventDefault()

    if (
      (e.target as HTMLFormElement).querySelector("input")?.value ===
        "razupaltuf"
    ) {
      loadStory(initialStory)
      isLoggedIn.value = true
      persistStore()
    } else {
      setPassword("")
    }
  }

  const handleReset = () => {
    resetProgress()
    loadStory(initialStory)
  }

  if (!isLoggedIn.value) {
    return (
      <div class="w-screen h-screen flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          class="w-md h-md border-2 rounded-sm p-4 flex flex-col items-center justify-center gap-4"
        >
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            class="border-2 border-gray-300 rounded-sm px-4 py-2 w-full"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors w-full"
          >
            Login
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      <StoryViewer initialStory={initialStory} onReset={handleReset} />
    </>
  )
}

export default Login
