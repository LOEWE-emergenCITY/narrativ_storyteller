import { useState } from "preact/hooks"
import { Story } from "@/utils/StoryTypes.tsx"
import StoryViewer from "@/islands/StoryViewer.tsx"

function Login({ initialStory }: { initialStory: Story }) {
  const [password, setPassword] = useState("")
  const [successfullLogin, setSuccessfullLogin] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault() // Prevent default form submission

    if (password === "razupaltuf") {
      setSuccessfullLogin(true)
    } else {
      setPassword("") // Clear input on wrong password
    }
  }

  if (!successfullLogin) {
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
      <StoryViewer initialStory={initialStory} />
    </>
  )
}

export default Login
