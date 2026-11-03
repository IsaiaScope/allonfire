// @module-tag unit

import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { API } from "../../../shared/constants/api";
import { captureLog } from "../../../shared/tests/capture";
import { TRANSLATION } from "../constants/locales";
import { translate, translateCode } from "../translate";

/** A value for every ICU argument the catalogue holds; a message ignores the rest. */
const SAMPLE_VALUES = { count: 2, limit: 1024, seconds: 5 };

/** Any surviving brace means a placeholder was not substituted. */
const UNRESOLVED_PLACEHOLDER = /[{}]/;

describe("translate — interpolation", () => {
  it("substitutes a value into the message", () => {
    expect(
      translate(ERROR.CODE.RATE_LIMITED, I18N.LOCALE.EN_US, { seconds: 30 })
    ).toBe("Too many requests. Retry in 30 seconds");
  });

  it("leaves no unresolved placeholders in any locale or code", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      const rendered = [
        translate(ERROR.CODE.VALIDATION_FAILED, locale, { count: 2 }),
        translate(ERROR.CODE.RATE_LIMITED, locale, { seconds: 5 }),
        translate(ERROR.CODE.TIMEOUT, locale, { seconds: 30 }),
        translate(ERROR.CODE.PAYLOAD_TOO_LARGE, locale, { limit: 1024 }),
        translate(ERROR.CODE.NOT_FOUND, locale),
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
      translate(ERROR.CODE.VALIDATION_FAILED, I18N.LOCALE.EN_US, { count: 1 })
    ).toBe("1 field failed validation");
  });

  it("picks the plural branch in English", () => {
    expect(
      translate(ERROR.CODE.VALIDATION_FAILED, I18N.LOCALE.EN_US, { count: 3 })
    ).toBe("3 fields failed validation");
  });

  it("uses Italian plural categories, not translated English branches", () => {
    expect(
      translate(ERROR.CODE.VALIDATION_FAILED, I18N.LOCALE.IT_IT, { count: 1 })
    ).toBe("1 campo non valido");
    expect(
      translate(ERROR.CODE.VALIDATION_FAILED, I18N.LOCALE.IT_IT, { count: 3 })
    ).toBe("3 campi non validi");
  });
});

describe("translate — locale-aware number formatting", () => {
  it("groups digits per locale from one declaration", () => {
    const en = translate(ERROR.CODE.PAYLOAD_TOO_LARGE, I18N.LOCALE.EN_US, {
      limit: 1_048_576,
    });
    const it = translate(ERROR.CODE.PAYLOAD_TOO_LARGE, I18N.LOCALE.IT_IT, {
      limit: 1_048_576,
    });
    expect(en).toContain("1,048,576");
    expect(it).toContain("1.048.576");
  });
});

describe("translate — regional variants", () => {
  it("renders a variant from its language base", () => {
    expect(translate(ERROR.CODE.NOT_FOUND, I18N.LOCALE.IT_CH)).toBe(
      TRANSLATION.CATALOGUE[I18N.LOCALE.IT_IT].NOT_FOUND
    );
    expect(translate(ERROR.CODE.NOT_FOUND, I18N.LOCALE.EN_GB)).toBe(
      TRANSLATION.CATALOGUE[I18N.LOCALE.EN_US].NOT_FOUND
    );
  });
});

describe("translate — resilience", () => {
  it("returns the same string for repeated calls (formatter cache)", () => {
    const first = translate(ERROR.CODE.TIMEOUT, I18N.LOCALE.IT_IT, {
      seconds: 30,
    });
    const second = translate(ERROR.CODE.TIMEOUT, I18N.LOCALE.IT_IT, {
      seconds: 30,
    });
    expect(first).toBe(second);
  });

  it("renders every key in every locale without falling back to English", () => {
    const { lines, logger } = captureLog();

    for (const locale of I18N.SUPPORTED_LOCALES) {
      for (const key of objectKeys(TRANSLATION.CATALOGUE[locale])) {
        translateCode(key, locale, SAMPLE_VALUES, logger);
      }
    }

    expect(lines).toEqual([]);
  });

  it("a missing translation serves English and warns with the key and locale", () => {
    const { lines, logger } = captureLog();

    // A runtime code whose value never arrived: ICU cannot render it.
    const rendered = translateCode(
      ERROR.CODE.RATE_LIMITED,
      I18N.LOCALE.IT_IT,
      undefined,
      logger
    );

    expect(rendered).toBe(
      TRANSLATION.CATALOGUE[TRANSLATION.DEFAULT_LOCALE][ERROR.CODE.RATE_LIMITED]
    );
    expect(lines).toEqual([
      expect.objectContaining({
        code: ERROR.CODE.RATE_LIMITED,
        err: expect.objectContaining({ message: expect.any(String) }),
        locale: I18N.LOCALE.IT_IT,
        msg: API.LOG_MESSAGE.TRANSLATION_FAILED,
      }),
    ]);
  });
});
