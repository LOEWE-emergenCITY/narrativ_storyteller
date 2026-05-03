import { define } from "@/utils.ts"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { Chat } from "../components/Chat.tsx"
import { MoodImage } from "../components/MoodImage.tsx"

export default define.page(function Home() {
  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold">Storyteller</h1>
        <Text>
          Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
          nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat,
          sed diam voluptua. At vero eos et accusam et justo duo dolores et ea
          rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem
          ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur
          sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et
          dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam
          et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea
          takimata sanctus est Lorem ipsum dolor sit amet.
        </Text>
        <Text>
          Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
          nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat,
          sed diam voluptua. At vero eos et accusam et justo duo dolores et ea
          rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem
          ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur
          sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et
          dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam
          et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea
          takimata sanctus est Lorem ipsum dolor sit amet.
        </Text>
        <Chat isReceiver>
          Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum
          dolor sit amet.
        </Chat>
        <Chat isSender>
          Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum
          dolor sit amet.
        </Chat>
        <MoodImage name="kathrin_regular" alt="kathrin_regular" />
        <MoodImage name="angela_annoyed" alt="angela_annoyed" />
        <Button choiceId="1">
          orem ipsum dolor sit amet, consetetur sadipscing elitr
        </Button>
        <Button choiceId="2">
          orem ipsum dolor sit amet, consetetur sadipscing elitr
        </Button>
        <Button className="justify-end" choiceId="3">
          orem ipsum dolor sit amet, consetetur sadipscing elitr
        </Button>
      </div>
    </div>
  )
})
