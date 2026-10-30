/**
 * `next/image` placeholder props for a blur data URL the database may not
 * have: blur when there is one, a plain box when there is not. Spread it:
 * `<Image {...blurPlaceholder(url)} />`.
 */
export function blurPlaceholder(
  blurDataURL: string | null
): { placeholder: "blur"; blurDataURL: string } | { placeholder: "empty" } {
  return blurDataURL
    ? { blurDataURL, placeholder: "blur" }
    : { placeholder: "empty" };
}
