import { z } from "zod";
import { MAIL, mailDriverSchema } from "../features/mail/constants/mail";
import type { MailEndpoint } from "../features/mail/types/mail";

const urlSchema = z.url({ protocol: /^https$/ });
const keySchema = z.string().min(1);

/**
 * A provider's endpoint, `API_MAIL_PROVIDER_<slot>_URL`, `_KEY` and `_DRIVER`,
 * read when it sends: a slot is any number an Admin's row names, so no
 * schema lists them at import. Anything missing, empty or invalid (a URL
 * that is not `https`, an unknown driver) reads as no endpoint at all.
 */
export const providerEndpoint = (
  slot: number,
  env: Readonly<Record<string, string | undefined>> = process.env
): MailEndpoint | undefined => {
  const read = (suffix: string) => env[`${MAIL.ENV.PREFIX}${slot}${suffix}`];
  const driver = mailDriverSchema.safeParse(read(MAIL.ENV.SUFFIX.DRIVER));
  const key = keySchema.safeParse(read(MAIL.ENV.SUFFIX.KEY));
  const url = urlSchema.safeParse(read(MAIL.ENV.SUFFIX.URL));
  return driver.success && key.success && url.success
    ? { driver: driver.data, key: key.data, url: url.data }
    : undefined;
};
