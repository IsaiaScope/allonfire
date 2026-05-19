export function cn(...parts: Array<false | null | string | undefined>) {
  return parts.filter(Boolean).join(" ");
}
