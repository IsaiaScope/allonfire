import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { JAPAN_IMAGE_COLOR } from "./image-colors";

/**
 * What the Japan Design adds to `AOFEmail` (`@allonfire/ui`): a hanko seal in
 * the band and one kanji for the email's purpose, set large beside its
 * heading. Mail clients carry no web font, so the face is a stack of the
 * Japanese serifs every system ships.
 */
export const JAPAN_EMAIL_LOOK = {
  flourish: {
    face: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
    /** One word per purpose: continue, set again, test, confirm. */
    kanji: {
      [MAIL.PURPOSE.KEEP_ALIVE]: "継続",
      [MAIL.PURPOSE.PASSWORD_RESET]: "再設定",
      [MAIL.PURPOSE.TEST]: "試験",
      [MAIL.PURPOSE.VERIFICATION]: "確認",
    },
    /** 火, fire: the brand's name on its seal. */
    seal: {
      background: JAPAN_IMAGE_COLOR.HANKO,
      ink: JAPAN_IMAGE_COLOR.dark.foreground,
      text: "火",
    },
  },
} as const;
