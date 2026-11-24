import type { Language } from "@allonfire/core/features/i18n/constants/locales";
import {
  objectEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { MESSAGE_LENGTH } from "./message-length";

type Tree = { [key: string]: string | Tree };

type Problems = {
  /** Errors longer than an alert keeps (`MESSAGE_LENGTH.ERROR`). */
  longErrors: string[];
  /** Notes longer than an alert keeps (`MESSAGE_LENGTH.NOTE`). */
  longNotes: string[];
  /** Toast keys that read longer than `MESSAGE_LENGTH.TOAST` once rendered. */
  longToasts: string[];
  /** Entries that are only a name, which comes from its constant. */
  onlyNames: string[];
};

type Options<Key extends string, Values> = {
  /** The App's words over the ones every App shares, per language. */
  en: Tree;
  it: Tree;
  /** The names that never change per language (the App's, the Brand's). */
  names: readonly string[];
  /** Values for the placeholders a toast message holds (a count, a name). */
  sample: Values;
  /** Every message a toast shows (`aofToast`), by its key. */
  toastKeys: readonly Key[];
  /**
   * A toast message as a visitor reads it. The App hands its own translator
   * (`enT`, `itT`): next-intl types a translator by its literal messages, so
   * a generic one cannot take a key it does not know.
   */
  translate: (locale: Language, key: Key, values: Values) => string;
};

const LOCALES = ["en", "it"] as const satisfies readonly Language[];

const strings = (tree: Tree): string[] =>
  objectValues(tree).flatMap((value) =>
    typeof value === "string" ? [value] : strings(value)
  );

/** Every string that is, or sits under, a key called `key`, at any depth. */
const under = (tree: Tree, key: string): string[] =>
  objectEntries(tree).flatMap(([name, value]) => {
    if (name === key) {
      return typeof value === "string" ? [value] : strings(value);
    }
    return typeof value === "string" ? [] : under(value, key);
  });

const longer = (texts: string[], limit: number) =>
  texts.filter((text) => text.length > limit);

/**
 * What is wrong with a pair of translations, each entry told as
 * `<locale>: <text>`. A name is the same in every language: it comes from its
 * constant, so renaming the App or the Brand is one change, never one per
 * language. A form's alert keeps a place two lines tall (three for a note)
 * and stops a longer message at an ellipsis: say it shorter. A toast has no
 * fixed place, yet it is read in a glance: every message one raises is listed
 * by key, and rendered (a count, a name) stays short.
 */
export const translationProblems = <Key extends string, Values>({
  en,
  it,
  names,
  sample,
  toastKeys,
  translate,
}: Options<Key, Values>): Problems => {
  const problems: Problems = {
    longErrors: [],
    longNotes: [],
    longToasts: [],
    onlyNames: [],
  };
  for (const locale of LOCALES) {
    const messages = locale === "en" ? en : it;
    const tag = (texts: string[]) => texts.map((text) => `${locale}: ${text}`);
    problems.onlyNames.push(
      ...tag(strings(messages).filter((text) => names.includes(text)))
    );
    problems.longErrors.push(
      ...tag(longer(under(messages, "error"), MESSAGE_LENGTH.ERROR))
    );
    problems.longNotes.push(
      ...tag(longer(under(messages, "note"), MESSAGE_LENGTH.NOTE))
    );
    problems.longToasts.push(
      ...tag(
        toastKeys.filter(
          (key) => translate(locale, key, sample).length > MESSAGE_LENGTH.TOAST
        )
      )
    );
  }
  return problems;
};

/** Registers the cases every App's translations pass. */
export const translationsSuite = <Key extends string, Values>(
  options: Options<Key, Values>
) => {
  describe("translations", () => {
    it("hold no entry that is only a name", () => {
      expect(translationProblems(options).onlyNames).toEqual([]);
    });

    it("keep every error within its alert's lines", () => {
      expect(translationProblems(options).longErrors).toEqual([]);
    });

    it("keep every note within its alert's lines", () => {
      expect(translationProblems(options).longNotes).toEqual([]);
    });

    it("keep every toast short", () => {
      expect(translationProblems(options).longToasts).toEqual([]);
    });
  });
};
