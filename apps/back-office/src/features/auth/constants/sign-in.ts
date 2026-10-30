/**
 * What the Sign in page shows that is not translated. Japanese is set, not
 * translated: it is the station's own signage, hidden from assistive tech
 * wherever the visitor's language says the same.
 */
export const SIGN_IN = {
  /** The departure board's status in kana: the ticket gate. */
  BOARD_KANA: "改札",
  /** 入, enter: set large behind the submit, what the gate lets you do. */
  ENTER_KANJI: "入",
  /** The board's standing notice in Japanese: sign-up is not possible. */
  NOTICE_KANA: "新規登録はできません",
  /** The platform the board stands on. */
  PLATFORM: "1",
  /** 認証, authentication: the seal stamped on the card. */
  SEAL: "認証",
} as const;
