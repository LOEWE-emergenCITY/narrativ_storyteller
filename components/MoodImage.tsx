export interface MoodImageProps {
  name: string
}

export function MoodImage(props: MoodImageProps) {
  const imgPath = `/moods/moods_${
    props.name.split("_")[0]
  }/eHub_Moods_${props.name}.jpg`

  return (
    <div class="w-full py-2 px-4">
      <img
        src={imgPath}
        alt={`Mood: ${props.name}`}
        class="w-full rounded-sm border border-gray-300"
      />
    </div>
  )
}
