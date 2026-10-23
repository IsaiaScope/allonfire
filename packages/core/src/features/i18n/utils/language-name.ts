/**
 * A language named in itself ("italiano", "English"), never read out as its
 * two-letter code. Each engine's own data: WebKit capitalises some names.
 */
export const languageName = (language: string): string =>
  new Intl.DisplayNames([language], { type: "language" }).of(language) ??
  language;
