import { AUTH } from "@allonfire/auth/shared/constants/auth";

/**
 * The page a verification link lands on, in `locale`, from the App's address.
 * Better Auth sends the reader there as is when the link worked and adds
 * `error` when it did not, so the mark on it is what tells a landing from a
 * page someone opened by hand.
 */
export const verifiedLanding = (appUrl: string, locale: string) =>
  `${appUrl}/${locale}${AUTH.PAGE.EMAIL_VERIFIED}?${AUTH.MAIL.VERIFIED_PARAM}=1`;
