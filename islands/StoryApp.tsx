import { useEffect, useState } from "preact/hooks"
import { TitleScreen } from "@/components/TitleScreen.tsx"
import StoryViewer from "@/islands/StoryViewer.tsx"
import { loadScienceFacts, loadStory } from "@/utils/storyStore.ts"
import { Story } from "@/utils/storyTypes.tsx"

type StoryAppProps = {
  story: Story
  scienceFacts: Record<string, string>
}

function StoryApp({ story, scienceFacts }: StoryAppProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    loadStory(story)
    loadScienceFacts(scienceFacts)
    setDataLoaded(true)
  }, [story, scienceFacts])

  const isReady = dataLoaded && imageLoaded

  if (!hasStarted) {
    return (
      <TitleScreen
        isReady={isReady}
        onStart={() => setHasStarted(true)}
        onImageLoad={() => setImageLoaded(true)}
      />
    )
  }

  return <StoryViewer />
}

export default StoryApp
