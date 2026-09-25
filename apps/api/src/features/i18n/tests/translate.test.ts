// @module-tag unit
import { ERROR_CODE } from "../../errors/constants/error-codes";
import { CATALOGUE, LOCALE, SUPPORTED_LOCALES } from "../constants/locales";
import { translate } from "../translate";

/** Any surviving brace means a placeholder was not substituted. */
const UNRESOLVED_PLACEHOLDER = /[{}]/;

describe("translate — interpolation", () => {
  it("substitutes a value into the message", () => {
    expect(
      translate(ERROR_CODE.RATE_LIMITED, LOCALE.EN_US, { seconds: 30 })
    ).toBe("Too many requests. Retry in 30 seconds");
  });

  it("leaves no unresolved placeholders in any locale or code", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const rendered = [
        translate(ERROR_CODE.VALIDATION_FAILED, locale, { count: 2 }),
        translate(ERROR_CODE.RATE_LIMITED, locale, { seconds: 5 }),
        translate(ERROR_CODE.TIMEOUT, locale, { seconds: 30 }),
        translate(ERROR_CODE.PAYLOAD_TOO_LARGE, locale, { limit: 1024 }),
        translate(ERROR_CODE.NOT_FOUND, locale),
      ];
      for (const message of rendered) {
        expect(message, `${locale}: ${message}`).not.toMatch(
          UNRESOLVED_PLACEHOLDER
        );
        expect(message).toBeTruthy();
      }
    }
  });
});

describe("translate — plurals", () => {
  it("picks the singular branch in English", () => {
    expect(
      translate(ERROR_CODE.VALIDATION_FAILED, LOCALE.EN_US, { count: 1 })
    ).toBe("1 field failed validation");
  });

  it("picks the plural branch in English", () => {
    expect(
      translate(ERROR_CODE.VALIDATION_FAILED, LOCALE.EN_US, { count: 3 })
    ).toBe("3 fields failed validation");
  });

  it("uses Italian plural categories, not translated English branches", () => {
    expect(
      translate(ERROR_CODE.VALIDATION_FAILED, LOCALE.IT_IT, { count: 1 })
    ).toBe("1 campo non valido");
    expect(
      translate(ERROR_CODE.VALIDATION_FAILED, LOCALE.IT_IT, { count: 3 })
    ).toBe("3 campi non validi");
  });
});

describe("translate — locale-aware number formatting", () => {
  it("groups digits per locale from one declaration", () => {
    const en = translate(ERROR_CODE.PAYLOAD_TOO_LARGE, LOCALE.EN_US, {
      limit: 1_048_576,
    });
    const it = translate(ERROR_CODE.PAYLOAD_TOO_LARGE, LOCALE.IT_IT, {
      limit: 1_048_576,
    });
    expect(en).toContain("1,048,576");
    expect(it).toContain("1.048.576");
  });
});

describe("translate — regional variants", () => {
  it("renders a variant from its language base", () => {
    expect(translate(ERROR_CODE.NOT_FOUND, LOCALE.IT_CH)).toBe(
      CATALOGUE[LOCALE.IT_IT].NOT_FOUND
    );
    expect(translate(ERROR_CODE.NOT_FOUND, LOCALE.EN_GB)).toBe(
      CATALOGUE[LOCALE.EN_US].NOT_FOUND
    );
  });
});

describe("translate — resilience", () => {
  it("returns the same string for repeated calls (formatter cache)", () => {
    const first = translate(ERROR_CODE.TIMEOUT, LOCALE.IT_IT, { seconds: 30 });
    const second = translate(ERROR_CODE.TIMEOUT, LOCALE.IT_IT, { seconds: 30 });
    expect(first).toBe(second);
  });

  it("never throws for any code in any locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(() => translate(ERROR_CODE.INTERNAL_ERROR, locale)).not.toThrow();
    }
  });
});
