import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { SERVICE } from "@allonfire/database/features/service/constants/service";

const IDLE_DAYS = 30;

const KEEP_ALIVE_RESULT = {
  /** Refused outright; for MAIL, a refused key means a dead one. */
  REJECTED: "rejected",
  SENT: "sent",
  /** It sent mail recently: nothing to do. */
  SKIPPED: "skipped",
  /** No endpoint, no room or no recipient: nothing could be tried. */
  UNAVAILABLE: "unavailable",
  /** Unknown whether it left: not retried. */
  UNCERTAIN: "uncertain",
} as const;

/** The Services module: Admins edit providers, the workflow keeps them alive. */
export const SERVICES = {
  DOC: {
    KEEP_ALIVE: {
      DESCRIPTION: `Runs the keep-alive of every Service that has one: MAIL sends one email through each enabled provider that accepted none in ${IDLE_DAYS} days, through that provider only. Called daily by the workflow service with the keep-alive token.`,
      RESPONSE: { [HTTP.STATUS.OK]: "What each provider's keep-alive did" },
      SUMMARY: "Keep every Service's providers alive",
    },
    LIST: {
      DESCRIPTION:
        "Every Service, its providers in slot order with their settings, the usage each provider's own API reports (null when it cannot say) and Version; never a key, only whether the provider is configured. Back Office Admins only.",
      RESPONSE: { [HTTP.STATUS.OK]: "Every Service and its providers" },
      SUMMARY: "List Services",
    },
    PROVIDER: {
      DESCRIPTION:
        "Saves a provider's settings on the Version they were opened on. Back Office Admins only.",
      RESPONSE: {
        [HTTP.STATUS.OK]: "The provider as saved, with its new Version",
      },
      SUMMARY: "Edit a provider",
    },
    SERVICE: {
      DESCRIPTION: "Turns a Service on or off. Back Office Admins only.",
      RESPONSE: { [HTTP.STATUS.OK]: "The Service as saved" },
      SUMMARY: "Turn a Service on or off",
    },
    TEST: {
      DESCRIPTION:
        "Sends one real email through this provider only, to the signed-in Admin's own address, counted against the address's hourly limit. Back Office Admins only.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "What became of the test email: acceptance, never delivery",
      },
      SUMMARY: "Send a test email through a provider",
    },
  },
  /** Thrown by the provider service itself (`ProviderIncompleteError`). */
  ERROR_CODE: SERVICE.ERROR_CODE,
  KEEP_ALIVE_RESULT,
  LIMIT: {
    IDLE_DAYS,
    /** How long a provider can go without sending before its keep-alive sends. */
    IDLE_MS: IDLE_DAYS * UNIT.MS_PER_DAY,
  },
  LOG_MESSAGE: {
    NO_RECIPIENT: "keep-alive sent nothing: API_KEEP_ALIVE_RECIPIENT is unset",
    USAGE_UNREADABLE: "mail provider usage could not be read",
  },
  OPENAPI_TAG: "Services",
  PATH: {
    BASE: "/services",
    KEEP_ALIVE: "/keep-alive",
    LIST: "/",
    PROVIDER: "/providers/:id",
    SERVICE: "/:type",
    TEST: "/providers/:id/test",
  },
  /**
   * How long a provider's reported usage is kept before it is asked again:
   * long enough that a page and its prefetch ask the vendor once, short
   * because the vendors' counts trail a send by seconds and a longer copy
   * would freeze a count taken in that gap.
   */
  USAGE_CACHE: { KEY_PREFIX: "mail:usage:", TTL_MS: 30 * UNIT.MS_PER_SECOND },
} as const;
