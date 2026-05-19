export type OverlayMode = "fullscreen" | "over-video";
export type OverlayTone = "coral" | "mustard" | "olive" | "ink";

export function toneTextClass(tone: OverlayTone) {
  if (tone === "mustard") {
    return "text-az-mustard";
  }

  if (tone === "olive") {
    return "text-az-olive";
  }

  if (tone === "ink") {
    return "text-az-ink";
  }

  return "text-az-coral";
}

export function toneBorderClass(tone: OverlayTone) {
  if (tone === "mustard") {
    return "border-az-mustard";
  }

  if (tone === "olive") {
    return "border-az-olive";
  }

  if (tone === "ink") {
    return "border-az-ink";
  }

  return "border-az-coral";
}

export function toneBgClass(tone: OverlayTone) {
  if (tone === "mustard") {
    return "bg-az-mustard";
  }

  if (tone === "olive") {
    return "bg-az-olive";
  }

  if (tone === "ink") {
    return "bg-az-ink";
  }

  return "bg-az-coral";
}
