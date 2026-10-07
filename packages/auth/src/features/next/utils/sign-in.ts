import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { forwardedFor } from "@allonfire/core/features/next/api/forwarded-for";
import { setCookieToHeader } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { SIGN_IN_ERROR, type SignInError } from "../constants/api";
import { canAccess } from "./access";
import { type ApiAuthClient, createApiAuthClient } from "./auth-client";
import { parseSetCookies } from "./set-cookie";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** A form field as text; a missing field or a file reads as empty. */
const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

/** Ends a Session the API just opened for someone the App refuses. */
const revoke = async (client: ApiAuthClient, sessionHeaders: Headers) => {
  await client
    .signOut({ fetchOptions: { headers: sessionHeaders } })
    .catch(() => undefined);
};

/** Why the API refused, by its status. */
const errorFor = (status: number) => {
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return SIGN_IN_ERROR.RATE_LIMITED;
  }
  return status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
    ? SIGN_IN_ERROR.UNAVAILABLE
    : SIGN_IN_ERROR.INVALID;
};

/**
 * Signs in through the API's Better Auth with the form's email and password.
 * Someone the App lets in gets the Session cookies on the App's own response
 * and no error back; anyone else's fresh Session is revoked at once.
 */
export const signInWithEmail = async (
  formData: FormData
): Promise<SignInError | undefined> => {
  const email = text(formData.get("email"));
  const password = formData.get("password");
  if (!(email && typeof password === "string" && password)) {
    return SIGN_IN_ERROR.MISSING;
  }
  const credentials = credentialsSchema.safeParse({ email, password });
  if (!credentials.success) {
    return SIGN_IN_ERROR.INVALID;
  }

  const client = createApiAuthClient();
  const forwarded = forwardedFor(await headers());
  // The new Session's cookies, as a request would send them, to revoke it.
  const sessionHeaders = new Headers(forwarded);
  let setCookies: string[] = [];
  let signedIn: Awaited<ReturnType<ApiAuthClient["signIn"]["email"]>>;
  try {
    signedIn = await client.signIn.email(credentials.data, {
      headers: forwarded,
      onResponse: (context) => {
        setCookies = context.response.headers.getSetCookie();
        setCookieToHeader(sessionHeaders)(context);
      },
    });
  } catch {
    return SIGN_IN_ERROR.UNAVAILABLE;
  }
  if (signedIn.error) {
    return errorFor(signedIn.error.status);
  }
  if (!canAccess(signedIn.data.user)) {
    await revoke(client, sessionHeaders);
    return SIGN_IN_ERROR.FORBIDDEN;
  }

  const jar = await cookies();
  for (const { name, value, options } of parseSetCookies(setCookies)) {
    jar.set(name, value, options);
  }
  return undefined;
};
