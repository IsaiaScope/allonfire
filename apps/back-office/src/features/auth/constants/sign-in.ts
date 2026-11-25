/**
 * What the Sign in page shows that is not translated. Japanese is set, not
 * translated: it is the station's own signage, hidden from assistive tech
 * wherever the visitor's language says the same.
 */
export const SIGN_IN = {
  KANA: {
    /** The departure board's status in kana: the ticket gate. */
    BOARD: "改札",
    /** The board's standing notice in Japanese: sign-up is not possible. */
    NOTICE: "新規登録はできません",
  },
  KANJI: {
    /** 入, enter: set large behind the submit, what the gate lets you do. */
    ENTER: "入",
  },
  /** The platform the board stands on. */
  PLATFORM: "1",
  /** 認証, authentication: the seal stamped on the card. */
  SEAL: "認証",
} as const;
