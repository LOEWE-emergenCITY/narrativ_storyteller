export interface MoodImageProps {
  name: string
  alt?: string
}

export function MoodImage(props: MoodImageProps) {
  console.log(props.name)
  const imgPath = `/moods/moods_${
    props.name.split("_")[0]
  }/eHub_Moods_${props.name}.jpg`
  console.log(imgPath)
  return (
    <div class="w-full py-2 px-4">
      <img
        src={imgPath}
        alt={props.alt}
        class="w-full rounded-sm border border-gray-300"
      />
    </div>
  )
}
