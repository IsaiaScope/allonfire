import type { MailStore } from "@allonfire/core/features/mail/types/mail";
import { ServiceType } from "@allonfire/database/enums";
import {
  enabledProviders,
  markAccepted,
  sendableProvider,
} from "@allonfire/database/features/service/provider.service";

/** The MAIL Service's providers, in the shared database. */
export const databaseMailStore: MailStore = {
  accepted: (providerId) => markAccepted(providerId),
  providers: async (only) => {
    if (only === undefined) {
      return enabledProviders(ServiceType.MAIL);
    }
    const provider = await sendableProvider(ServiceType.MAIL, only);
    return provider ? [provider] : [];
  },
};
