import { LOCAL } from "@allonfire/config/local/addresses";
import { E2E } from "@allonfire/config/tests/e2e/run";
import { expect, request } from "@playwright/test";

/** An email the fake provider took, as the driver sent it. */
export type SentMail = {
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string;
};

/** Every email the run's fake provider took for `email`, oldest first. */
export const mailTo = async (email: string): Promise<SentMail[]> => {
  // The provider's certificate is throwaway: the API trusts it, a spec does not need to.
  const client = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const answer = await client.get(
      `${LOCAL.URL.MAIL_SINK_E2E}${E2E.MAIL_SINK.PATH.SENT}`,
      { params: { to: email } }
    );
    return await answer.json();
  } finally {
    await client.dispose();
  }
};

/**
 * Waits for `count` emails to `email` (they leave after the response, so a
 * page can answer before the provider has them) and returns them.
 */
export const mailArrives = async (email: string, count = 1) => {
  await expect.poll(async () => (await mailTo(email)).length).toBe(count);
  return mailTo(email);
};

const WHITESPACE = /\s+/;

/** The one link in an email's text: the button's address. */
export const linkIn = ({ text }: SentMail): string => {
  const link = text.split(WHITESPACE).find((word) => word.startsWith("http"));
  if (!link) {
    throw new Error(`no link in the email: ${text}`);
  }
  return link;
};
