// @module-tag unit

import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { translationsSuite } from "@allonfire/ui/shared/tests/translations-suite";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { enT, itT } from "@/shared/tests/translators";

/** Every message a toast shows (`aofToast`), by its key. A new toast's key goes in this list. */
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
  "Common.ImageUpload.field.fileTooLarge",
  "Common.ImageUpload.field.tooManyFiles",
  "Common.ImageUpload.field.totalTooLarge",
  "Users.add.avatarFailed",
  "Users.delete.done",
  "Users.delete.gone",
  "Users.delete.partly",
  "Users.edit.avatarFailed",
  "Users.edit.saved",
  "Users.form.avatar.unreadable",
  "Users.form.avatar.wrongType",
] as const;

/** What a page reads: the App's words over the ones every App shares. */
const enMessages = aofMessages("en", EN);
const itMessages = aofMessages("it", IT);

translationsSuite({
  en: enMessages,
  it: itMessages,
  names: [BACK_OFFICE.name, BRAND.NAME, BACK_OFFICE.shareImageAlt],
  sample: { count: 2, deleted: 2, gone: 3, name: "Provider 1" },
  toastKeys: TOAST_KEYS,
  translate: (locale, key, values) =>
    (locale === "en" ? enT : itT)(key, values),
});

describe("Back Office translations", () => {
  it("holds the sign-in's verification link note as a note, not an error", () => {
    for (const messages of [enMessages, itMessages]) {
      expect(messages.Common.Auth.SignIn.note.unverified).toBeTruthy();
    }
  });
});
