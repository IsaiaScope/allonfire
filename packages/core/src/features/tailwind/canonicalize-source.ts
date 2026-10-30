import { Scanner } from "@tailwindcss/oxide";
import ts from "typescript";

/** One class in, its canonical spelling out; the class itself when there is none. */
export type Canonicalize = (candidate: string) => string;

/** A string's text inside a source file: `[start, end)`, in UTF-16 offsets. */
type Span = { end: number; start: number };

const SCRIPT_KIND: Partial<Record<string, ts.ScriptKind>> = {
  js: ts.ScriptKind.JS,
  jsx: ts.ScriptKind.JSX,
  ts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX,
};

/**
 * Where classes can be: the text of every string and template literal, JSX
 * attribute values included. Tailwind's scanner also reports words in code,
 * and `!list` in `if (!a || !list)` reads to it as an important `list` class
 * whose canonical spelling is `list!`.
 */
const stringSpans = (content: string, kind: ts.ScriptKind): Span[] => {
  const file = ts.createSourceFile(
    "source",
    content,
    ts.ScriptTarget.Latest,
    false,
    kind
  );
  const spans: Span[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) {
      spans.push({ end: node.end, start: node.getStart(file) });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return spans;
};

/**
 * Rewrites every Tailwind class in `content` to its canonical spelling, the one
 * the editor's `suggestCanonicalClasses` hint asks for (`rounded-[4px]` to
 * `rounded-lg`). Candidates are found by Tailwind's own scanner, so strings,
 * `cn()` calls and `cva()` variants are covered without a regex of ours; in a
 * script only those inside a string are rewritten, never code.
 *
 * The scanner reports string (UTF-16) offsets, so the edits are applied last
 * first, and one that overlaps an edit already made is skipped.
 */
export function canonicalizeSource(
  content: string,
  extension: string,
  canonicalize: Canonicalize
): string {
  const kind = SCRIPT_KIND[extension];
  const spans = kind === undefined ? null : stringSpans(content, kind);
  const inString = (from: number, to: number) =>
    spans === null ||
    spans.some((span) => span.start <= from && to <= span.end);
  const edits = new Scanner({})
    .getCandidatesWithPositions({ content, extension })
    .map(({ candidate, position }) => ({
      from: candidate,
      position,
      to: canonicalize(candidate),
    }))
    .filter(
      (edit) =>
        edit.to !== edit.from &&
        inString(edit.position, edit.position + edit.from.length)
    )
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
