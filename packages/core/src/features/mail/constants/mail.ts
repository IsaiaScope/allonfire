import { z } from "zod";
import { UNIT } from "../../../shared/constants/units";

/** How mail leaves through a Service's providers. */
export const MAIL = {
  /**
   * What a driver's `send` made of one handoff: taken, refused for want of
   * room (daily, monthly or rate), refused outright, or unknown.
   */
  ATTEMPT: {
    ACCEPTED: "accepted",
    QUOTA: "quota",
    REJECTED: "rejected",
    UNCERTAIN: "uncertain",
  },
  /** The account plan whose credits are the day's remaining allowance. */
  DAILY_PLAN_TYPE: "free",
  /** The API shapes the drivers speak, named for the shape, never a vendor. */
  DRIVER: {
    /** `Authorization: Bearer`, a flat `from`, `html` and `text`. */
    BEARER_FLAT: "bearer-flat",
    /** An `api-key` header, a nested `sender`, `htmlContent` and `textContent`. */
    KEY_HEADER_ENVELOPE: "key-header-envelope",
  },
  /** A provider's endpoint: `API_MAIL_PROVIDER_<slot>_URL`, `_KEY` and `_DRIVER`. */
  ENV: {
    PREFIX: "API_MAIL_PROVIDER_",
    SUFFIX: { DRIVER: "_DRIVER", KEY: "_KEY", URL: "_URL" },
  },
  HEADER: {
    /** The header `KEY_HEADER_ENVELOPE` carries its key in. */
    API_KEY: "api-key",
    /**
     * A reference unique to each message, sent along in its headers: Resend
     * documents it as the way to keep Gmail from threading mail that looks
     * alike (and from trimming the repeats behind "..."); Brevo's
     * `headers` takes any non-standard header.
     */
    ENTITY_REF_ID: "X-Entity-Ref-ID",
  },
  HTTP: {
    /** Node's codes for a failure known to have sent nothing: DNS, refused connection. */
    DEFINITE_ERROR_CODES: ["ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN"],
    /** The only scheme a provider's URL may use: the key never travels in clear. */
    PROTOCOL: "https",
    TIMEOUT_MS: 15 * UNIT.MS_PER_SECOND,
  },
  /** What an Admin may set on a provider: the API refuses more, so the form does too. */
  LIMIT: {
    /** The longest sender address (RFC 5321). */
    ADDRESS_MAX: 254,
    /** The longest provider name. */
    NAME_MAX: 60,
    /** The highest daily or monthly limit. */
    USAGE_MAX: 1_000_000,
  },
  LOG_MESSAGE: {
    ACCEPTED: "mail accepted by provider",
    NO_ENDPOINT:
      "mail provider has no usable URL, key and driver in the environment",
    NO_PROVIDER: "no mail provider could take the message",
    QUOTA: "mail provider has no room left; trying the next",
    REJECTED: "mail provider rejected the message",
    STORE_FAILED: "mail provider store failed",
    UNCERTAIN: "mail provider outcome unknown; not retried elsewhere",
  },
  /** What became of a send, as a caller reads it. */
  OUTCOME: {
    /** A provider accepted it: queued or relayed, not proof of delivery. */
    ACCEPTED: "accepted",
    /** Every provider tried refused it outright. */
    REJECTED: "rejected",
    /** No provider was enabled, configured and with room to spare. */
    UNAVAILABLE: "unavailable",
    /** Unknown whether it left (a timeout after the handoff); never retried. */
    UNCERTAIN: "uncertain",
  },
  /** Each driver's paths, under the endpoint's URL. */
  PATH: {
    BEARER_FLAT: { METRICS: "/emails/metrics", SEND: "/emails" },
    KEY_HEADER_ENVELOPE: {
      ACCOUNT: "/account",
      REPORT: "/smtp/statistics/aggregatedReport",
      SEND: "/smtp/email",
    },
  },
  /** Why a send is made; a log field, nothing counts by it. */
  PURPOSE: {
    KEEP_ALIVE: "keep-alive",
    PASSWORD_RESET: "password-reset",
    TEST: "test",
    VERIFICATION: "verification",
  },
  /** What `KEY_HEADER_ENVELOPE` answers when the account has no credits left. */
  QUOTA_CODE: "not_enough_credits",
  /** The credits that count sends. */
  SEND_CREDITS: "sendLimit",
} as const;

/** The window the page's "last month" ring covers, in days. */
export const USAGE_MONTH_DAYS = 31;

export const mailDriverSchema = z.enum(MAIL.DRIVER);
export type MailDriver = z.infer<typeof mailDriverSchema>;

const mailAttemptSchema = z.enum(MAIL.ATTEMPT);
export type MailAttempt = z.infer<typeof mailAttemptSchema>;

const mailPurposeSchema = z.enum(MAIL.PURPOSE);
export type MailPurpose = z.infer<typeof mailPurposeSchema>;

export const sendOutcomeSchema = z.enum(MAIL.OUTCOME);
export type SendOutcome = z.infer<typeof sendOutcomeSchema>;
