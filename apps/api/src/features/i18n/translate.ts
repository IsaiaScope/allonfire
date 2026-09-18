import { memoize, strategies } from "@formatjs/fast-memoize";
import { type Formatters, IntlMessageFormat } from "intl-messageformat";
import {
  CATALOGUE,
  DEFAULT_LOCALE,
  type Locale,
  type TranslationKey,
} from "./constants/locales";
import type { TranslationValues } from "./translation-values";

// `variadic` keys the cache on every argument. The default picks by arity, and
// optional parameters count as none — these would reach variadic by accident.
const VARIADIC = { strategy: strategies.variadic };

/**
 * One Intl cache shared by every message. IntlMessageFormat builds its own per
 * instance, so N messages x M locales makes N x M copies. Measured 92 ms -> 20 ms.
 */
const INTL: Formatters = {
  getNumberFormat: memoize(
    (locales?: string | string[], options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locales, options),
    VARIADIC
  ),
  getDateTimeFormat: memoize(
    (locales?: string | string[], options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locales, options),
    VARIADIC
  ),
  getPluralRules: memoize(
    (locales?: string | string[], options?: Intl.PluralRulesOptions) =>
      new Intl.PluralRules(locales, options),
    VARIADIC
  ),
};

// Parsing ICU costs far more than formatting it, and the catalogue is fixed at
// build time, so every formatter is cached forever.
// ponytail: unbounded on purpose, ceiling is the catalogue itself.
const formatters = new Map<string, IntlMessageFormat>();

function formatterFor(key: TranslationKey, locale: Locale): IntlMessageFormat {
  const cacheKey = `${locale}:${key}`;
  let formatter = formatters.get(cacheKey);

  if (!formatter) {
    formatter = new IntlMessageFormat(
      CATALOGUE[locale][key],
      locale,
      undefined,
      {
        formatters: INTL,
      }
    );
    formatters.set(cacheKey, formatter);
  }

  return formatter;
}

/**
 * Renders a message in `locale`. `TranslationValues` decides whether `values` is
 * required or illegal, so a missing one is a compile error rather than raw ICU
 * in the response. Falls back to the English source if the string is malformed.
 */
export function translate<K extends TranslationKey>(
  key: K,
  locale: Locale,
  ...[values]: [TranslationValues[K]] extends [never]
    ? []
    : [TranslationValues[K]]
): string {
  try {
    return formatterFor(key, locale).format(values) as string;
  } catch {
    return CATALOGUE[DEFAULT_LOCALE][key];
  }
}
