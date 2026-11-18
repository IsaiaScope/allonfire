// @module-tag unit

import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import {
  objectEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { MESSAGE_LENGTH } from "@allonfire/ui/shared/tests/message-length";
import { createTranslator } from "next-intl";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { BACK_OFFICE } from "@/shared/constants/back-office";

type Tree = { [key: string]: string | Tree };

const strings = (tree: Tree): string[] =>
  objectValues(tree).flatMap((value) =>
    typeof value === "string" ? [value] : strings(value)
  );

/** Every string under a key called `key`, at any depth. */
const under = (tree: Tree, key: string): string[] =>
  objectEntries(tree).flatMap(([name, value]) => {
    if (typeof value === "string") {
      return [];
    }
    return name === key ? strings(value) : under(value, key);
  });

/** Every message a toast shows (`aofToast`), by its key. */
const TOAST_KEYS = [
  "Services.saved",
  "Services.serviceEnabled.failed",
  "Services.test.accepted",
  "Services.test.failed",
  "Services.test.rateLimited",
  "Services.test.rejected",
  "Services.test.removed",
  "Services.test.uncertain",
  "Services.test.unavailable",
  "Services.usage.unread",
  "Images.add.added",
  "Images.edit.saved",
  "Images.form.field.fileTooLarge",
  "Images.form.field.tooManyFiles",
  "Images.form.field.totalTooLarge",
  "Users.add.avatarFailed",
  "Users.delete.done",
  "Users.delete.gone",
  "Users.delete.partly",
  "Users.edit.avatarFailed",
  "Users.edit.saved",
  "Users.form.avatar.unreadable",
  "Users.form.avatar.wrongType",
] as const;

const NAMES: readonly string[] = [
  BACK_OFFICE.name,
  BRAND.NAME,
  BACK_OFFICE.shareImageAlt,
];

/** What a page reads: the App's words over the ones every App shares. */
const MERGED = [
  ["en", aofMessages("en", EN)],
  ["it", aofMessages("it", IT)],
] as const;

describe("translations", () => {
  // A name is the same in every language: it comes from its constant, so
  // renaming the App or the brand is one change, never one per language.
  it.each(MERGED)(
    "%s holds no entry that is only a name",
    (_, translations) => {
      expect(
        strings(translations).filter((text) => NAMES.includes(text))
      ).toEqual([]);
    }
  );

  // A form's alert keeps a place two lines tall (three for a note) and
  // stops a longer message at an ellipsis: say it shorter.
  it.each(MERGED)(
    "%s keeps every error and note within its alert's lines",
    (_, translations) => {
      expect(
        under(translations, "error").filter(
          (text) => text.length > MESSAGE_LENGTH.ERROR
        )
      ).toEqual([]);
      expect(
        under(translations, "note").filter(
          (text) => text.length > MESSAGE_LENGTH.NOTE
        )
      ).toEqual([]);
    }
  );

  it("holds the sign-in's verification link note as a note, not an error", () => {
    for (const [, messages] of MERGED) {
      expect(under(messages, "note")).toContain(
        messages.Common.Auth.SignIn.note.unverified
      );
    }
  });

  // A toast has no fixed place, yet it is read in a glance: every message
  // one raises is listed here, and rendered (a count, a name) stays short.
  // A new toast's key goes in this list.
  it.each(MERGED)("%s keeps every toast short", (locale, messages) => {
    const t = createTranslator({ locale, messages });
    const SAMPLE = { count: 2, deleted: 2, gone: 3, name: "Provider 1" };
    const tooLong = TOAST_KEYS.filter(
      (key) => t(key, SAMPLE).length > MESSAGE_LENGTH.TOAST
    );
    expect(tooLong).toEqual([]);
  });
});
