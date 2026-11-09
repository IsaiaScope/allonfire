import type { MailAttempt, MailDriver, SendOutcome } from "../constants/mail";

/** One email, already rendered. */
export type MailMessage = {
  /** Custom headers a provider sends along, beside the ones it writes itself. */
  headers?: Readonly<Record<string, string>> | undefined;
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** What a send needs of a provider's row: who it is and who it sends as. */
export type SendingProvider = {
  id: string;
  slot: number;
  name: string;
  fromAddress: string;
};

/** Where a provider is reached: its API's base URL, its key and the shape it speaks. */
export type MailEndpoint = {
  driver: MailDriver;
  url: string;
  key: string;
};

export type MailFetch = typeof fetch;

/**
 * What a provider's own API says it sent: today (the UTC day) and in the
 * last 31 days, and the limits it reports for them, null where it reports none.
 */
export type MailUsage = {
  day: number;
  month: number;
  dayLimit: number | null;
  monthLimit: number | null;
};

/** What an Admin set on a provider's card, for a driver that needs it to read usage. */
type MailUsageLimits = {
  dailyLimit: number;
};

/** One API shape: how to hand it a message, and how to read its usage. */
export type MailDriverImpl = {
  /** Never throws: every failure is one of the attempts. */
  send: (
    endpoint: MailEndpoint,
    message: MailMessage & { from: string },
    fetcher: MailFetch
  ) => Promise<MailAttempt>;
  /** Null when the provider cannot say (refused, down, unreadable). */
  usage: (
    endpoint: MailEndpoint,
    now: Date,
    fetcher: MailFetch,
    limits: MailUsageLimits
  ) => Promise<MailUsage | null>;
};

/** Where the providers live. */
export type MailStore = {
  /**
   * The enabled providers of the enabled Service, in slot order; with `only`,
   * just that provider, which may be off (a test), while the Service is on.
   */
  providers: (only?: string) => Promise<SendingProvider[]>;
  /** Stamps the provider's last acceptance. */
  accepted: (providerId: string) => Promise<void>;
};

type LogFn = (bindings: Record<string, unknown>, message: string) => void;
export type MailLogger = { info: LogFn; warn: LogFn; error: LogFn };

export type MailDeps = {
  store: MailStore;
  /** The driver of each API shape; the real stack passes `MAIL_DRIVERS`. */
  drivers: Record<MailDriver, MailDriverImpl>;
  /** A slot's endpoint from the environment; undefined when it is unusable. */
  endpoint: (slot: number) => MailEndpoint | undefined;
  fetch: MailFetch;
  logger: MailLogger;
};

/** What became of a send, and the provider it ended on, if any. */
export type SendResult = { outcome: SendOutcome; providerId?: string };
