import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { authErrorCodeSchema } from "@allonfire/auth/shared/constants/errors";
import { cookieOf } from "@allonfire/auth/shared/tests/stub-auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import type { App } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { z } from "zod";
import { API } from "../constants/api";

/** What these helpers need of an app built by `createApp`. */
export type TestApp = {
  request: (path: string, init?: RequestInit) => Response | Promise<Response>;
};

/** Where every test request comes from: an App's origin the API allows. */
export const ORIGIN = LOCAL.URL.LAURA;

/**
 * Signs `email` in, with the Fixture password unless told otherwise.
 * `userAgent` marks the Session it opens, so a test can find it while other
 * files sign the same User in.
 */
export const signIn = (
  app: TestApp,
  { email }: { email: string },
  {
    appName,
    password = FIXTURE.PASSWORD,
    userAgent,
  }: { appName?: App; password?: string; userAgent?: string } = {}
) =>
  app.request(`${API.PATH.AUTH}${AUTH.PATH.SIGN_IN_EMAIL}`, {
    body: stringifyJson({ email, password }),
    headers: {
      "content-type": HTTP.CONTENT_TYPE.JSON,
      origin: ORIGIN,
      ...(appName && { [AUTH.HEADER.APP]: appName }),
      ...(userAgent && { "user-agent": userAgent }),
    },
    method: "POST",
  });

/**
 * Only the Session token: without the signed copy Better Auth caches in a
 * cookie, a request is checked against the Session row.
 */
export const tokenOnly = (cookie: string) =>
  cookie
    .split("; ")
    .filter((part) => part.includes("session_token"))
    .join("; ");

/** Better Auth's refusal code; its handler answers with `{ code, message }`. */
export const authCodeOf = async (res: Response) =>
  z.object({ code: authErrorCodeSchema }).parse(await res.json()).code;

/** Signs in and returns the cookie; a refused sign-in fails the test. */
export async function cookieFor(
  app: TestApp,
  user: { email: string }
): Promise<string> {
  const res = await signIn(app, user);
  if (!res.ok) {
    throw new Error(`sign-in for ${user.email} answered ${res.status}`);
  }
  return cookieOf(res);
}

const sessionSchema = z
  .object({
    user: z.object({
      email: z.string(),
      memberships: z.array(z.object({ app: z.string(), role: z.string() })),
    }),
  })
  .nullable();

/** The Session `cookie` holds, or null when it holds none. */
export async function getSession(app: TestApp, cookie: string) {
  const res = await app.request(`${API.PATH.AUTH}${AUTH.PATH.GET_SESSION}`, {
    headers: { cookie, origin: ORIGIN },
  });
  return sessionSchema.parse(await res.json());
}
