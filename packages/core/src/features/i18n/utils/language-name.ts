import { PATTERN } from "../../../shared/constants/patterns";

/**
 * A language named in itself ("Italiano", "English"), never read out as its
 * two-letter code, starting with a capital. Each engine has its own data:
 * Node writes "italiano" where WebKit writes "Italiano", and a page the
 * server draws with one and the browser with the other fails to hydrate.
 * Some rarer languages still get a different word from each engine.
 */
export const languageName = (language: string): string => {
  const name =
    new Intl.DisplayNames([language], { type: "language" }).of(language) ??
    language;
  const first = name.charAt(0);
  return PATTERN.SCRIPT.GEORGIAN.test(first)
    ? name
    : `${first.toLocaleUpperCase(language)}${name.slice(1)}`;
};
