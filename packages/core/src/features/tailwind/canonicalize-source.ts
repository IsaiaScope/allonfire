import { Scanner } from "@tailwindcss/oxide";

/** One class in, its canonical spelling out; the class itself when there is none. */
export type Canonicalize = (candidate: string) => string;

/**
 * Rewrites every Tailwind class in `content` to its canonical spelling, the one
 * the editor's `suggestCanonicalClasses` hint asks for (`rounded-[4px]` to
 * `rounded-lg`). Candidates are found by Tailwind's own scanner, so strings,
 * `cn()` calls and `cva()` variants are covered without a regex of ours.
 *
 * The scanner reports string (UTF-16) offsets, so the edits are applied last
 * first, and one that overlaps an edit already made is skipped.
 */
export function canonicalizeSource(
  content: string,
  extension: string,
  canonicalize: Canonicalize
): string {
  const edits = new Scanner({})
    .getCandidatesWithPositions({ content, extension })
    .map(({ candidate, position }) => ({
      from: candidate,
      position,
      to: canonicalize(candidate),
    }))
    .filter((edit) => edit.to !== edit.from)
    .sort((a, b) => b.position - a.position);

  let result = content;
  let untouchedBefore = content.length;
  for (const { from, position, to } of edits) {
    const end = position + from.length;
    if (result.slice(position, end) !== from || end > untouchedBefore) {
      continue;
    }
    result = result.slice(0, position) + to + result.slice(end);
    untouchedBefore = position;
  }
  return result;
}
