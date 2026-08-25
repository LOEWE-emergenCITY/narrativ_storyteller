export interface ImageProps {
  name: string
  type: "mood" | "scene"
}

export function Image(props: ImageProps) {
  let imgPath

  if (props.type === "mood") {
    imgPath = `/moods/moods_${
      props.name.split("_")[0]
    }/eHub_moods_${props.name}_72dpi.jpg`
  } else if (props.type === "scene") {
    imgPath = `/scenes/eHub_${props.name}.jpg`
  } else {
    return null
  }

  return (
    <div class="w-full py-2 px-4">
      <img
        src={imgPath}
        alt={`${props.type}: ${props.name}`}
        class="w-full rounded-sm border border-theme shadow-sm"
      />
    </div>
  )
}
