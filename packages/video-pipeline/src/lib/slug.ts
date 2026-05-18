export function slugify(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length === 0) {
    throw new Error(`Empty slug produced from input: ${JSON.stringify(input)}`);
  }
  return normalized;
}

export function slugifyOrFallback(input: string, fallback: string): string {
  try {
    return slugify(input);
  } catch {
    return slugify(fallback.trim().length > 0 ? fallback : "untitled");
  }
}
