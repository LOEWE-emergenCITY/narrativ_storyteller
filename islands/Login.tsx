import { useState } from "preact/hooks"
import { Story } from "@/utils/storyTypes.tsx"
import StoryViewer from "@/islands/StoryViewer.tsx"
import { isLoggedIn, loadScienceFacts, loadStory } from "@/utils/storyStore.ts"

function Login(
  {
    initialStory,
    initialScienceFacts,
  }: { initialStory: Story; initialScienceFacts: Record<string, string> },
) {
  const [password, setPassword] = useState("")

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()

    if (password === "razupaltuf") {
      // loadStory runs first — storyBlocks is populated before StoryViewer mounts
      loadStory(initialStory)
      loadScienceFacts(initialScienceFacts)
      isLoggedIn.value = true
    } else {
      setPassword("")
    }
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

  return <StoryViewer />
}

export default Login
