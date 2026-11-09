import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { Locale } from "@allonfire/core/features/i18n/constants/locales";
import type {
  MailUsage,
  SendResult,
} from "@allonfire/core/features/mail/types/mail";
import type {
  listServices,
  updateProvider,
  updateService,
} from "@allonfire/database/features/service/provider.service";
import type { KeepAliveReport } from "./keep-alive";

/** What the Services routes need of the stack; tests stub it. */
export type ServicesDeps = {
  canManage: CanManage;
  listServices: typeof listServices;
  updateService: typeof updateService;
  updateProvider: typeof updateProvider;
  /** Whether a slot has a usable URL, key and driver in the environment. */
  configured: (slot: number) => boolean;
  /** What the provider's own API says it sent; null when it cannot say. Never throws in production; the route guards it anyway. */
  usageOf: (provider: {
    dailyLimit: number;
    id: string;
    slot: number;
  }) => Promise<MailUsage | null>;
  /** Drops a provider's cached usage: a send or a new limit moved its count. */
  forgetUsage: (providerId: string) => Promise<void>;
  /** A User's email, read now, so a test goes where they read mail today. */
  emailOf: (userId: string) => Promise<string | null>;
  /** Counts one email for the address this hour; false when it had its five. */
  takeAddress: (email: string) => Promise<boolean>;
  /** Null when the provider is gone, which the route answers as a 404. */
  sendTest: (
    providerId: string,
    to: string,
    locale: Locale
  ) => Promise<SendResult | null>;
  keepAlive: () => Promise<KeepAliveReport>;
  /** The token the workflow service sends; unset, the keep-alive refuses everyone. */
  keepAliveToken: string | undefined;
};
