import { getLocale } from "next-intl/server";
import { APP_PATH } from "../constants/access";
import { redirectTo } from "./redirect-to";
import { getAppSession } from "./session";

/**
 * The guard every signed-in page calls first: the Session of someone this App
 * lets in, or a redirect to Sign in for anyone else. Checked where the page
 * renders, not in a layout, so each navigation checks again.
 */
export const requireAppSession = async () => {
  const session = await getAppSession();
  if (!session) {
    return redirectTo(await getLocale(), APP_PATH.SIGN_IN);
  }
  return session;
};
