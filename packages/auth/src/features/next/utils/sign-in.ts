import { HTTP } from "@allonfire/core/features/http/constants/http";
import { forwardedHeaders } from "@allonfire/core/features/next/api/forwarded-for";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { nextAuthEnv } from "../../../environment/next-environment";
import { AUTH } from "../../../shared/constants/auth";
import type { SignInError } from "../constants/api";
import { type ApiAuthClient, createApiAuthClient } from "./auth-client";
import { adoptSetCookies } from "./set-cookie";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** A form field as text; a missing field or a file reads as empty. */
const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

/**
 * Why the API refused, by its status. Only the App's own refusal is
 * `forbidden`: Better Auth also answers 403 to an untrusted origin, a
 * misconfiguration, not this User's fault.
 */
const errorFor = ({ code, status }: { code?: string; status: number }) => {
  if (status === HTTP.STATUS.FORBIDDEN) {
    return code === AUTH.ERROR_CODE.APP_FORBIDDEN
      ? AUTH.SIGN_IN_ERROR.FORBIDDEN
      : AUTH.SIGN_IN_ERROR.UNAVAILABLE;
  }
  if (status === HTTP.STATUS.TOO_MANY_REQUESTS) {
    return AUTH.SIGN_IN_ERROR.RATE_LIMITED;
  }
  return status >= HTTP.STATUS.INTERNAL_SERVER_ERROR
    ? AUTH.SIGN_IN_ERROR.UNAVAILABLE
    : AUTH.SIGN_IN_ERROR.INVALID;
};

/**
 * Signs in through the API's Better Auth with the form's email and password,
 * naming this App: the API refuses anyone the App does not let in and opens
 * no Session for them. Someone let in gets the Session cookies on the App's
 * own response and no error back.
 */
export const signInWithEmail = async (
  formData: FormData
): Promise<SignInError | undefined> => {
  const email = text(formData.get("email"));
  const password = formData.get("password");
  if (!(email && typeof password === "string" && password)) {
    return AUTH.SIGN_IN_ERROR.MISSING;
  }
  const credentials = credentialsSchema.safeParse({ email, password });
  if (!credentials.success) {
    return AUTH.SIGN_IN_ERROR.INVALID;
  }

  const requestHeaders = new Headers(forwardedHeaders(await headers()));
  requestHeaders.set(AUTH.HEADER.APP, nextAuthEnv.AUTH_APP);
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
    return AUTH.SIGN_IN_ERROR.UNAVAILABLE;
  }
  if (signedIn.error) {
    return errorFor(signedIn.error);
  }
  adoptSetCookies(await cookies(), setCookies);
  return undefined;
};
