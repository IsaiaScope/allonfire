// @module-tag unit
import { createTranslator } from "next-intl";
import { MESSAGE_LENGTH } from "./message-length";
import { translationProblems } from "./translations-suite";

const NAME = "Laura";
const CLEAN = { Common: { title: "Welcome" } };
const NONE = { longErrors: [], longNotes: [], longToasts: [], onlyNames: [] };
type Toasts = { Toast: { saved: string } };
const TOAST_KEY = "Toast.saved";
/** The App's translator over its own messages, as `enT` and `itT` are. */
const translatorOver =
  (en: Toasts, it: Toasts) =>
  (locale: "en" | "it", key: typeof TOAST_KEY, values: { name: string }) =>
    createTranslator({ locale, messages: locale === "en" ? en : it })(
      key,
      values
    );
const base = {
  en: CLEAN,
  it: CLEAN,
  names: [NAME],
  sample: { name: "Provider 1" },
  toastKeys: [],
  translate: () => "",
};

describe("translationProblems", () => {
  it("reports four empty lists for a clean pair", () => {
    expect(translationProblems(base)).toEqual(NONE);
  });

  it("reports an error longer than an alert keeps", () => {
    const problems = translationProblems({
      ...base,
      en: { A: { error: "x".repeat(MESSAGE_LENGTH.ERROR + 1) } },
    });
    expect(problems.longErrors).toHaveLength(1);
    expect(problems.longNotes).toEqual([]);
  });

  it("reports a note longer than an alert keeps, at any depth", () => {
    const problems = translationProblems({
      ...base,
      it: { A: { B: { note: "x".repeat(MESSAGE_LENGTH.NOTE + 1) } } },
    });
    expect(problems.longNotes).toHaveLength(1);
  });

  it("accepts an error exactly at the limit", () => {
    expect(
      translationProblems({
        ...base,
        en: { A: { error: "x".repeat(MESSAGE_LENGTH.ERROR) } },
      })
    ).toEqual(NONE);
  });

  it("reports an entry that is only a name", () => {
    const problems = translationProblems({
      ...base,
      en: { A: { title: NAME } },
    });
    expect(problems.onlyNames).toHaveLength(1);
  });

  it("reports a toast that is long once rendered", () => {
    const SAVED = {
      Toast: { saved: `${"x".repeat(MESSAGE_LENGTH.TOAST)} {name}` },
    };
    const problems = translationProblems({
      ...base,
      en: SAVED,
      sample: { name: "Provider 1" },
      toastKeys: [TOAST_KEY],
      translate: translatorOver(SAVED, { Toast: { saved: "Saved" } }),
    });
    expect(problems.longToasts).toEqual([`en: ${TOAST_KEY}`]);
  });

  it("measures a toast as rendered, not as written", () => {
    const SAVED = { Toast: { saved: "Saved {name}" } };
    expect(
      translationProblems({
        ...base,
        en: SAVED,
        sample: { name: "x".repeat(MESSAGE_LENGTH.TOAST) },
        toastKeys: [TOAST_KEY],
        translate: translatorOver(SAVED, SAVED),
      }).longToasts
    ).toEqual([`en: ${TOAST_KEY}`, `it: ${TOAST_KEY}`]);
  });
});
