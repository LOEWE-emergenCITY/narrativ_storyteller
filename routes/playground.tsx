import { define } from "@/utils.ts"
import { Text } from "@/components/Text.tsx"
import { Button } from "@/components/Button.tsx"
import { Chat } from "../components/Chat.tsx"
import { MoodImage } from "../components/MoodImage.tsx"
import { ScienceFactBadge } from "@/components/ScienceFactBadge.tsx"
import { loadScienceFacts } from "@/utils/storyStore.ts"

export default define.page(async function Home() {
  const scienceFacts = JSON.parse(
    await Deno.readTextFile("data/science_facts.json"),
  ) as Record<string, string>

  loadScienceFacts(scienceFacts)

  return (
    <div class="px-4 py-8 mx-auto bg-[#f9f9f9] min-h-screen">
      <div class="max-w-3xl mx-auto flex flex-col items-center justify-start">
        <h1 class="text-4xl font-bold">Storyteller</h1>
        <Text html="Lorem <b>ipsum</b> dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod <i>tempor</i> invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet." />
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
        <Chat isAngela={false} sender="Kathrin">
          Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum
          dolor sit amet.
        </Chat>
        <Chat isAngela={true} sender="Angela">
          Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum
          dolor sit amet. Stet clita kasd gubergren, no sea takimata sanctus est
          Lorem ipsum dolor sit amet.
        </Chat>

        <Chat isAngela={true} sender="Angela">
          NVM MEIS.
        </Chat>
        <Chat isAngela={false} sender="Angela">
          bla bla.
        </Chat>
        <MoodImage name="kathrin_regular" />
        <MoodImage name="angela_annoyed" />
        <Button choiceId="1">
          orem ipsum dolor sit amet, consetetur sadipscing elitr
        </Button>
        <Button choiceId="2">
          orem ipsum dolor sit amet, consetetur sadipscing elitr
        </Button>
        <Button className="justify-end" choiceId="3">
          orem ipsum dolor sit amet, consetetur sadipscing elitr
        </Button>
        <Button className="justify-end">
          next
        </Button>
        <Text html="<i>italic</i> <b>bold</b> <br /> now a break <br /> not italic not bold" />

        <ScienceFactBadge name="LoraWAN" />
      </div>
    </div>
  )
})
