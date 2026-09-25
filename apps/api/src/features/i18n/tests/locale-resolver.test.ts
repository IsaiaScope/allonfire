// @module-tag unit
import { objectEntries, objectKeys } from "@allonfire/utils/helpers/object";
import {
  CATALOGUE,
  DEFAULT_LOCALE,
  LOCALE,
  type Locale,
  SUPPORTED_LOCALES,
} from "../constants/locales";
import { resolveLocale } from "../middleware/locale-resolver";

describe("resolveLocale — exact regional variants", () => {
  it("matches a fully specified variant", () => {
    expect(resolveLocale("it-CH")).toBe(LOCALE.IT_CH);
    expect(resolveLocale("it-IT")).toBe(LOCALE.IT_IT);
    expect(resolveLocale("en-GB")).toBe(LOCALE.EN_GB);
  });

  it("normalizes casing before matching", () => {
    expect(resolveLocale("IT-ch")).toBe(LOCALE.IT_CH);
    expect(resolveLocale("EN-gb")).toBe(LOCALE.EN_GB);
  });
});

describe("resolveLocale — bare language falls back to a variant", () => {
  it("resolves a bare tag to that language's variant", () => {
    expect(resolveLocale("it")).toBe(LOCALE.IT_IT);
    expect(resolveLocale("en")).toBe(LOCALE.EN_US);
  });

  it("resolves an unregistered region to the nearest variant", () => {
    // `XX` is not a real region, so nothing beats the language default.
    expect(resolveLocale("it-XX")).toBe(LOCALE.IT_IT);
  });

  it("uses CLDR language distance, not just the language default", () => {
    // Australian English is closer to British than American English, so this
    // is `en-GB` even though `en` alone resolves to `en-US`. Stripping the
    // region and taking the first variant would get this wrong.
    expect(resolveLocale("en-AU")).toBe(LOCALE.EN_GB);
    expect(resolveLocale("en")).toBe(LOCALE.EN_US);
  });

  it("never returns a bare language", () => {
    for (const header of ["it", "en", "it-XX", "de", ""]) {
      expect(SUPPORTED_LOCALES).toContain(resolveLocale(header));
    }
  });
});

describe("resolveLocale — fallback", () => {
  it("defaults when the header is absent or empty", () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("defaults when no requested language is supported", () => {
    expect(resolveLocale("ja-JP")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("de-DE,fr-FR,ja")).toBe(DEFAULT_LOCALE);
  });

  it("defaults on a malformed header rather than throwing", () => {
    for (const header of [",,,", ";q=0.9", "-", "   ", "!!!", "en_US"]) {
      expect(() => resolveLocale(header)).not.toThrow();
      expect(SUPPORTED_LOCALES).toContain(resolveLocale(header));
    }
  });
});

describe("resolveLocale — quality values", () => {
  it("strips q-values from a single entry", () => {
    expect(resolveLocale("it-CH;q=0.9")).toBe(LOCALE.IT_CH);
  });

  it("skips unsupported entries and takes the first supported one", () => {
    expect(resolveLocale("de-DE,fr;q=0.8,it;q=0.7")).toBe(LOCALE.IT_IT);
  });

  it("honours q-order rather than written order", () => {
    // `de` outranks `it` despite being written second; `de` is unsupported, so
    // `it` wins on the next pass. This pins the ordering behaviour — a parser
    // that ignored q-values would reach the same answer for the wrong reason.
    expect(resolveLocale("it;q=0.1,de;q=0.9")).toBe(LOCALE.IT_IT);
    expect(resolveLocale("it-CH;q=0.1,it-IT;q=0.9")).toBe(LOCALE.IT_IT);
  });
});

describe("error catalogue", () => {
  it("covers every code in every locale with a non-empty string", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const [key, message] of objectEntries(CATALOGUE[locale])) {
        expect(message, `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it("gives every locale the same set of codes", () => {
    const sortedCodes = (locale: Locale) =>
      objectKeys(CATALOGUE[locale]).sort((a, b) => a.localeCompare(b));
    for (const locale of SUPPORTED_LOCALES) {
      expect(sortedCodes(locale)).toEqual(sortedCodes(DEFAULT_LOCALE));
    }
  });

  it("actually differs across languages", () => {
    expect(CATALOGUE[LOCALE.IT_IT].NOT_FOUND).not.toBe(
      CATALOGUE[LOCALE.EN_US].NOT_FOUND
    );
  });
});
