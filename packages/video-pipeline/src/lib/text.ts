type SegmenterLike = {
  segment(value: string): Iterable<{ segment: string }>;
};

type SegmenterCtor = new (
  locale?: string,
  options?: { granularity?: "grapheme" | "word" | "sentence" }
) => SegmenterLike;

const intlWithSegmenter = Intl as typeof Intl & {
  Segmenter?: SegmenterCtor;
};

const segmenter = intlWithSegmenter.Segmenter
  ? new intlWithSegmenter.Segmenter(undefined, { granularity: "grapheme" })
  : null;

const COMBINING_MARK_RE = /^\p{Mark}+$/u;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const WIDE_RE =
  /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u;

function isControlGrapheme(value: string): boolean {
  const code = value.codePointAt(0);
  return code !== undefined && (code <= 0x1f || code === 0x7f);
}

export function graphemes(value: string): string[] {
  if (!segmenter) {
    return Array.from(value);
  }
  return Array.from(segmenter.segment(value), (part) => part.segment);
}

export function firstGrapheme(value: string): string {
  return graphemes(value)[0] ?? "";
}

function graphemeWidth(value: string): number {
  if (value.length === 0 || isControlGrapheme(value)) {
    return 0;
  }
  if (COMBINING_MARK_RE.test(value)) {
    return 0;
  }
  if (EMOJI_RE.test(value) || WIDE_RE.test(value)) {
    return 2;
  }
  return 1;
}

export function displayWidth(value: string): number {
  return graphemes(value).reduce(
    (width, part) => width + graphemeWidth(part),
    0
  );
}

export function takeDisplayWidth(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }

  let used = 0;
  let output = "";
  for (const part of graphemes(value)) {
    const next = graphemeWidth(part);
    if (used + next > width) {
      break;
    }
    used += next;
    output += part;
  }
  return output;
}

export function truncateUtf8(value: string, maxBytes: number): string {
  if (maxBytes <= 0) {
    return "";
  }

  const encoder = new TextEncoder();
  let used = 0;
  let output = "";
  for (const part of graphemes(value)) {
    const bytes = encoder.encode(part).byteLength;
    if (used + bytes > maxBytes) {
      break;
    }
    used += bytes;
    output += part;
  }
  return output;
}
