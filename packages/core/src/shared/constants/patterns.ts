/** Regular expressions more than one package matches with. */
export const PATTERN = {
  /** One character of each kind, in any script with case: a letter without
   *  case (CJK, Arabic) is neither lowercase nor uppercase, and anything
   *  that is not a letter or a digit (a space too) is a symbol. */
  CHARACTER: {
    DIGIT: /\p{Nd}/u,
    LOWERCASE: /\p{Ll}/u,
    SYMBOL: /[^\p{L}\p{Nd}]/u,
    UPPERCASE: /\p{Lu}/u,
  },
  /** Stripped from a URL or path before comparing or appending to it. */
  TRAILING_SLASHES: /\/+$/,
  /** One or more spaces, tabs or line breaks: what splits a search into words. */
  WHITESPACE: /\s+/,
} as const;
