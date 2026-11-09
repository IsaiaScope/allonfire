import { UNIT } from "@allonfire/core/shared/constants/units";
import { SERVICE } from "@allonfire/database/features/service/constants/service";
import { z } from "zod";

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
    KEEP_ALIVE_200: "What each provider's keep-alive did",
    KEEP_ALIVE_DESCRIPTION:
      "Runs the keep-alive of every Service that has one: MAIL sends one email through each enabled provider that accepted none in 30 days, through that provider only. Called daily by the workflow service with the keep-alive token.",
    KEEP_ALIVE_SUMMARY: "Keep every Service's providers alive",
    LIST_200: "Every Service and its providers",
    LIST_DESCRIPTION:
      "Every Service, its providers in slot order with their settings, the usage each provider's own API reports (null when it cannot say) and Version; never a key, only whether the provider is configured. Back Office Admins only.",
    LIST_SUMMARY: "List Services",
    PROVIDER_200: "The provider as saved, with its new Version",
    PROVIDER_DESCRIPTION:
      "Saves a provider's settings on the Version they were opened on. Back Office Admins only.",
    PROVIDER_SUMMARY: "Edit a provider",
    SERVICE_200: "The Service as saved",
    SERVICE_DESCRIPTION: "Turns a Service on or off. Back Office Admins only.",
    SERVICE_SUMMARY: "Turn a Service on or off",
    TEST_200: "What became of the test email: acceptance, never delivery",
    TEST_DESCRIPTION:
      "Sends one real email through this provider only, to the signed-in Admin's own address, counted against the address's hourly limit. Back Office Admins only.",
    TEST_SUMMARY: "Send a test email through a provider",
  },
  /** Thrown by the provider service itself (`ProviderIncompleteError`). */
  ERROR_CODE: SERVICE.ERROR_CODE,
  /** How long a provider may go without sending before its keep-alive sends. */
  IDLE_MS: IDLE_DAYS * UNIT.MS_PER_DAY,
  KEEP_ALIVE_RESULT,
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

export const keepAliveResultSchema = z.enum(KEEP_ALIVE_RESULT);
export type KeepAliveResult = z.infer<typeof keepAliveResultSchema>;
