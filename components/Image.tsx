export interface ImageProps {
  name: string
  type: "mood" | "scene"
}

export function getImagePath(name: string, type: ImageProps["type"]): string {
  if (type === "mood") {
    return `/moods/moods_${name.split("_")[0]}/eHub_moods_${name}.jpg`
  }

  return `/scenes/eHub_${name}.jpg`
}

export function Image(props: ImageProps) {
  const imgPath = getImagePath(props.name, props.type)

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
