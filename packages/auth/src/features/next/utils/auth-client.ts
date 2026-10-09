import { createAuthClient } from "better-auth/client";
import { customSessionClient } from "better-auth/client/plugins";
import { nextAuthEnv } from "../../../environment/next-environment";
import type { Auth } from "../../server/auth";

/**
 * Better Auth's own client for the API's auth routes, used from an App's
 * server (Better Auth's docs: `better-auth/client` in server actions, server
 * components and the proxy). Typed from the server's config, Memberships
 * included; `Auth` is a type import, so no Prisma reaches the App. Every
 * call passes the visitor's cookies and address in `fetchOptions.headers`,
 * and reads the cookies the API sets in `onResponse`.
 */
export const createApiAuthClient = () =>
  createAuthClient({
    baseURL: nextAuthEnv.API_AUTH_URL,
    plugins: [customSessionClient<Auth>()],
  });

export type ApiAuthClient = ReturnType<typeof createApiAuthClient>;

/** A Session as the API sends it, with the User's Memberships. */
export type Session = ApiAuthClient["$Infer"]["Session"];
