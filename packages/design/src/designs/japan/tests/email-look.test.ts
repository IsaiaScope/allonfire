// @module-tag unit
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { JAPAN_EMAIL_LOOK } from "../email-look";

const KANJI = /^\p{Script=Han}+$/u;

describe("JAPAN_EMAIL_LOOK", () => {
  it("has a kanji word for every purpose an email is sent for", () => {
    for (const purpose of objectValues(MAIL.PURPOSE)) {
      expect(JAPAN_EMAIL_LOOK.flourish.kanji[purpose]).toMatch(KANJI);
    }
  });

  it("stamps a one-kanji seal", () => {
    expect(JAPAN_EMAIL_LOOK.flourish.seal.text).toMatch(KANJI);
    expect([...JAPAN_EMAIL_LOOK.flourish.seal.text]).toHaveLength(1);
  });
});
