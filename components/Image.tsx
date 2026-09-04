export interface ImageProps {
  name: string
  type: "mood" | "scene"
  fallbackName?: string
}

export function getImagePath(name: string, type: ImageProps["type"]): string {
  if (type === "mood") {
    return `/moods/moods_${name.split("_")[0]}/eHub_moods_${name}_72dpi.jpg`
  }

  return `/scenes/eHub_${name}.jpg`
}

export function Image(props: ImageProps) {
  const imgPath = getImagePath(props.name, props.type)
  const fallbackPath = props.fallbackName
    ? getImagePath(props.fallbackName, props.type)
    : undefined

  return (
    <div class="w-full py-2 px-4">
      <img
        src={imgPath}
        alt={`${props.type}: ${props.name}`}
        class="w-full rounded-sm border border-theme shadow-sm"
        onError={fallbackPath
          ? (event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = fallbackPath
          }
          : undefined}
      />
    </div>
  )
}
