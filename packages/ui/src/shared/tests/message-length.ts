/**
 * How long a message may be, in characters, as it reads: said short, never
 * trimmed by the screen (`features/i18n/tests/translations.test.ts` fails on
 * a longer one). A form's `FormAlert` keeps a place for its message (about 37
 * characters a line on a small phone): an error is two lines, a note (a link
 * sent, nothing failed: its strings sit under a `note` key) three; a longer
 * one stops at an ellipsis. A toast has no such place, but a few words a line
 * are all it is read for.
 */
export const MESSAGE_LENGTH = {
  /** An error, under any `error` key of a translation. */
  ERROR: 70,
  /** A note, under any `note` key. */
  NOTE: 105,
  /** A toast, as rendered (`TOAST_KEYS` in the translations test). */
  TOAST: 60,
} as const;
