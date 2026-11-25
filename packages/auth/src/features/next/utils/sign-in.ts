import { HTTP } from "@allonfire/core/features/http/constants/http";
import { textOf } from "@allonfire/core/features/next/api/utils/aof-refusal";
import { BASE_ERROR_CODES } from "better-auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";
import type { SignInError } from "../../../shared/constants/auth-schema";
import { appHeaders } from "./app-request";
import { type ApiAuthClient, createApiAuthClient } from "./auth-client";
import { adoptSetCookies } from "./set-cookie";

const credentialsSchema = z.object({
  /** Where a verification link sent on this sign-in lands: the App's Sign in. */
  callbackURL: z.url().optional(),
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Why the API refused, by its status. Only the App's own refusal is
 * `forbidden`: Better Auth also answers 403 to an untrusted origin, a
 * misconfiguration, not this User's fault.
 */
const errorFor = ({ code, status }: { code?: string; status: number }) => {
  if (status === HTTP.STATUS.FORBIDDEN) {
    if (code === BASE_ERROR_CODES.EMAIL_NOT_VERIFIED.code) {
      return AUTH.ERROR.SIGN_IN.UNVERIFIED;
    }
    return code === AUTH.ERROR_CODE.APP_FORBIDDEN
      ? AUTH.ERROR.SIGN_IN.FORBIDDEN
      : AUTH.ERROR.SIGN_IN.UNAVAILABLE;
  }
  if (status === HTTP.STATUS.TOO_MANY_REQUESTS) {
    return AUTH.ERROR.SIGN_IN.RATE_LIMITED;
  }
  return status >= HTTP.STATUS.INTERNAL_SERVER_ERROR
    ? AUTH.ERROR.SIGN_IN.UNAVAILABLE
    : AUTH.ERROR.SIGN_IN.INVALID;
};

/**
 * Signs in through the API's Better Auth with the form's email and password,
 * naming this App, and the page a verification link should land on
 * (`callbackURL`, when the form posts one): the API refuses anyone the App does not let in and opens
 * no Session for them. Someone let in gets the Session cookies on the App's
 * own response and no error back.
 */
export const signInWithEmail = async (
  formData: FormData
): Promise<SignInError | undefined> => {
  const email = textOf(formData, "email").trim();
  const password = formData.get("password");
  if (!(email && typeof password === "string" && password)) {
    return AUTH.ERROR.SIGN_IN.MISSING;
  }
  const callbackURL = textOf(formData, "callbackURL").trim() || undefined;
  const credentials = credentialsSchema.safeParse({
    callbackURL,
    email,
    password,
  });
  if (!credentials.success) {
    return AUTH.ERROR.SIGN_IN.INVALID;
  }

  const requestHeaders = await appHeaders();
  let setCookies: string[] = [];
  let signedIn: Awaited<ReturnType<ApiAuthClient["signIn"]["email"]>>;
  try {
    signedIn = await createApiAuthClient().signIn.email(credentials.data, {
      headers: requestHeaders,
      onResponse: (context) => {
        setCookies = context.response.headers.getSetCookie();
      },
    });
  } catch {
    return AUTH.ERROR.SIGN_IN.UNAVAILABLE;
  }
  if (signedIn.error) {
    return errorFor(signedIn.error);
  }
  adoptSetCookies(await cookies(), setCookies);
  return undefined;
};
