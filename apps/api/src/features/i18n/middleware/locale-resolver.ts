import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  I18N,
  type Locale,
  localeSchema,
} from "@allonfire/core/features/i18n/constants/locales";
import { match } from "@formatjs/intl-localematcher";
import type { Context, MiddlewareHandler } from "hono";
import Negotiator from "negotiator";
import { API } from "../../../shared/constants/api";
import { TRANSLATION } from "../constants/locales";

/**
 * Resolves the response locale from `Accept-Language`. Negotiator orders the
 * candidates by q-value, `match()` runs RFC 4647 lookup with CLDR
 * likely-subtags — so `it` lands on `it-IT` and `it-XX` falls back to it.
 *
 * Never throws: a malformed tag yields `TRANSLATION.DEFAULT_LOCALE`, because a bad language
 * header is not a reason to fail a call that would otherwise succeed.
 */
export function resolveLocale(header: string | undefined): Locale {
  if (!header) {
    return TRANSLATION.DEFAULT_LOCALE;
  }

  try {
    const requested = new Negotiator({
      // Negotiator reads this key verbatim, so it must stay lower-case.
      headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: header },
    }).languages();

    if (requested.length === 0) {
      return TRANSLATION.DEFAULT_LOCALE;
    }

    // `match` returns a bare string; parsing re-narrows it.
    const matched = match(
      requested,
      I18N.SUPPORTED_LOCALES,
      TRANSLATION.DEFAULT_LOCALE
    );
    const parsed = localeSchema.safeParse(matched);
    return parsed.success ? parsed.data : TRANSLATION.DEFAULT_LOCALE;
  } catch {
    return TRANSLATION.DEFAULT_LOCALE;
  }
}

/** Reads the resolved locale, defaulting for calls made outside the chain. */
export const localeOf = (context: Context): Locale =>
  context.get(API.CONTEXT_VAR.LOCALE) ?? TRANSLATION.DEFAULT_LOCALE;

export const localeResolver =
  (): MiddlewareHandler => async (context, next) => {
    context.set(
      API.CONTEXT_VAR.LOCALE,
      resolveLocale(context.req.header(HTTP.HEADER.ACCEPT_LANGUAGE))
    );
    await next();
  };
