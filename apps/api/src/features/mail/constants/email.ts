import { UNIT } from "@allonfire/core/shared/constants/units";
import { App } from "@allonfire/database/enums";
import { JAPAN_EMAIL_LOOK } from "@allonfire/design/designs/japan/email-look";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import {
  AOF_EMAIL_LOOK,
  type AOFEmailLook,
} from "@allonfire/ui/features/email/components/aof-email";

/** The emails the API sends: who may receive how many, and what each App's wear. */
export const EMAIL = {
  /**
   * How many emails one address receives in any rolling hour, verification
   * and reset together, whichever route asks. An Admin's provider test counts
   * apart (`TEST_KEY_PREFIX`), so anonymous reset requests for an Admin's
   * address cannot use up the budget their own test needs.
   */
  ADDRESS_LIMIT: {
    KEY_PREFIX: "mail:address:",
    MAX: 5,
    TEST_KEY_PREFIX: "mail:test:",
    WINDOW_MS: UNIT.MS_PER_HOUR,
  },
  LOG_MESSAGE: {
    ADDRESS_LIMITED: "email refused: the address had its emails this hour",
    LIMIT_UNAVAILABLE: "email refused: the per-address limit cannot count",
    NO_RESET_PAGE: "reset email refused: the request named no page to land on",
    NOT_SENT: "email not sent",
  },
  /** Each App's look; mail with no App named wears the shared one. */
  LOOK: {
    [App.BACK_OFFICE]: {
      ...AOF_EMAIL_LOOK,
      accent: JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP,
      accentInk: JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP_FOREGROUND,
      brand: "AllOnFire Back Office",
      ...JAPAN_EMAIL_LOOK,
    },
    [App.LAURA]: { ...AOF_EMAIL_LOOK, brand: "Laura" },
  } as const satisfies Record<App, AOFEmailLook>,
} as const;
