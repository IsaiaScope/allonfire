// @module-tag unit
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { translationsSuite } from "@allonfire/ui/shared/tests/translations-suite";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { LAURA } from "@/shared/constants/laura";
import { enT, itT } from "@/shared/tests/translators";

/** Every message a toast shows (`aofToast`), by its key. A new toast's key goes in this list. */
const TOAST_KEYS = [] as const;

translationsSuite({
  en: aofMessages("en", EN),
  it: aofMessages("it", IT),
  names: [LAURA.name, BRAND.NAME, LAURA.shareImageAlt],
  sample: {},
  toastKeys: TOAST_KEYS,
  translate: (locale, key) => (locale === "en" ? enT : itT)(key),
});

describe("Laura translations", () => {
  it("describes the App in both languages", () => {
    expect(EN.Metadata.description).toBeTruthy();
    expect(IT.Metadata.description).toBeTruthy();
  });
});
