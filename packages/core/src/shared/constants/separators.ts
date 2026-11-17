export const SEPARATOR = {
  /** Between a sort's column and its direction: `created.desc`. */
  DIRECTION: ".",
  /** Between a search field and its value: `role:admin`. */
  FIELD: ":",
  /** Comma-delimited header values and comma-delimited env lists. */
  LIST: ",",
  /** Between names shown in a line: `Laura, Back Office`. */
  NAMES: ", ",
  /** Splits `key=value` in a key/value env list such as OTLP headers. */
  PAIR: "=",
  /** Joins a zod issue path into `a.b.c`. */
  PATH: ".",
  /** Between the two days of a range: `2026-11-26..2026-11-28`. */
  RANGE: "..",
  /** Between a page's own title and its App's name in a tab title. */
  TITLE: " – ",
  /** Between the words of a search. */
  WORD: " ",
} as const;
