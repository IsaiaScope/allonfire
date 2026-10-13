import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import type { AOFStorageImageSource } from "@allonfire/ui/components/aof-image";

const { alt, blurDataUrl, height, key, width } = FIXTURE.IMAGE.SIGN_IN;

/**
 * The sign-in photograph, a Back office Image in storage (credit on the
 * Fixture). Decorative, so its alt is empty.
 *
 * Every bucket holds it: the seed's Image files locally, each test run's own
 * bucket, and the deploy's `storage-setup` in Production.
 */
const IMAGE = {
  alt,
  blurDataUrl,
  height,
  key,
  width,
} as const satisfies AOFStorageImageSource;

/**
 * What the Sign in page shows that is not translated. Japanese is set, not
 * translated: it is the station's own signage, hidden from assistive tech
 * wherever the visitor's language says the same.
 */
export const SIGN_IN = {
  /** The departure board's status in kana: the ticket gate. */
  BOARD_KANA: "改札",
  IMAGE,
  /** The board's standing notice in Japanese: sign-up is not possible. */
  NOTICE_KANA: "新規登録はできません",
  /** The platform the board stands on. */
  PLATFORM: "1",
  /** 認証, authentication: the seal stamped on the card. */
  SEAL: "認証",
} as const;
