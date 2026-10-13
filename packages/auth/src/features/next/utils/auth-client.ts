import { createAuthClient } from "better-auth/client";
import { customSessionClient } from "better-auth/client/plugins";
import { nextAuthEnv } from "../../../environment/next-environment";
import { AUTH } from "../../../shared/constants/auth";
import type { Auth } from "../../server/auth";

/**
 * Better Auth's own client for the API's auth routes, used from an App's
 * server (Better Auth's docs: `better-auth/client` in server actions, server
 * components and the proxy). Typed from the server's config, Memberships
 * included; `Auth` is a type import, so no Prisma reaches the App. Every
 * call passes the visitor's cookies and address in `fetchOptions.headers`,
 * and reads the cookies the API sets in `onResponse`; a call the API does
 * not answer within `AUTH.API_TIMEOUT_MS` is aborted, and fails like any other.
 */
export const createApiAuthClient = () =>
  createAuthClient({
    baseURL: nextAuthEnv.API_AUTH_URL,
    fetchOptions: { timeout: AUTH.API_TIMEOUT_MS },
    plugins: [customSessionClient<Auth>()],
  });

export type ApiAuthClient = ReturnType<typeof createApiAuthClient>;

/** A Session as the API sends it, with the User's Memberships. */
export type Session = ApiAuthClient["$Infer"]["Session"];
