import type { JSX } from "preact"

export function updateGlowPosition(
  event: JSX.TargetedPointerEvent<HTMLButtonElement>,
) {
  const button = event.currentTarget
  const rect = button.getBoundingClientRect()

  button.style.setProperty("--glow-x", `${event.clientX - rect.left}px`)
  button.style.setProperty("--glow-y", `${event.clientY - rect.top}px`)
}

export function activateGlow(
  event: JSX.TargetedPointerEvent<HTMLButtonElement>,
) {
  updateGlowPosition(event)
  event.currentTarget.dataset.glowActive = "true"
}

export function clearGlow(
  event: JSX.TargetedPointerEvent<HTMLButtonElement>,
) {
  delete event.currentTarget.dataset.glowActive
}
