import { match } from "@formatjs/intl-localematcher";
import type { Context, MiddlewareHandler } from "hono";
import Negotiator from "negotiator";
import { HTTP_HEADER } from "../../../shared/constants/http";
import { CONTEXT_VAR } from "../../../shared/constants/runtime";
import {
  DEFAULT_LOCALE,
  type Locale,
  localeSchema,
  SUPPORTED_LOCALES,
} from "../constants/locales";

/**
 * Resolves the response locale from `Accept-Language`. Negotiator orders the
 * candidates by q-value, `match()` runs RFC 4647 lookup with CLDR
 * likely-subtags — so `it` lands on `it-IT` and `it-XX` falls back to it.
 *
 * Never throws: a malformed tag yields `DEFAULT_LOCALE`, because a bad language
 * header is not a reason to fail a call that would otherwise succeed.
 */
export function resolveLocale(header: string | undefined): Locale {
  if (!header) {
    return DEFAULT_LOCALE;
  }

  try {
    const requested = new Negotiator({
      // Negotiator reads this key verbatim, so it must stay lower-case.
      headers: { [HTTP_HEADER.ACCEPT_LANGUAGE]: header },
    }).languages();

    if (requested.length === 0) {
      return DEFAULT_LOCALE;
    }

    // `match` returns a bare string; parsing re-narrows it.
    const matched = match(requested, SUPPORTED_LOCALES, DEFAULT_LOCALE);
    const parsed = localeSchema.safeParse(matched);
    return parsed.success ? parsed.data : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Reads the resolved locale, defaulting for calls made outside the chain. */
export const localeOf = (context: Context): Locale =>
  context.get(CONTEXT_VAR.LOCALE) ?? DEFAULT_LOCALE;

export const localeResolver =
  (): MiddlewareHandler => async (context, next) => {
    context.set(
      CONTEXT_VAR.LOCALE,
      resolveLocale(context.req.header(HTTP_HEADER.ACCEPT_LANGUAGE))
    );
    await next();
  };
