import { prisma } from "@allonfire/database";
import { AllowedApp, Role } from "@allonfire/database/enums";
import { objectValues } from "@allonfire/utils/helpers/object";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";
import { COOKIE_CACHE_MAX_AGE_S } from "../../shared/constants/limits";
import { OPENAPI_SCHEMA_PATH } from "../../shared/constants/paths";
import type { AuthLike } from "../../shared/types/auth";
import { allowedAppsFrom, roleFrom } from "../access/access";

export type CreateAuthOptions = {
  secret: string;
  /** Public origin the host is reached at. */
  baseURL: string;
  /** Where the host mounted the routes, e.g. `/v1/auth`. */
  basePath: string;
  /** Browser origins allowed to send cookie-bearing requests. */
  trustedOrigins: string[];
};

export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    ...options,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    disabledPaths: [OPENAPI_SCHEMA_PATH],
    // Users are created by the seed, never by a request.
    emailAndPassword: { disableSignUp: true, enabled: true },
    plugins: [openAPI({ disableDefaultReference: true })],
    // The host rate-limits with its own shared store; Better Auth's default is
    // per-process memory and does not know the proxy hop count.
    rateLimit: { enabled: false },
    session: {
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_S },
    },
    user: {
      additionalFields: {
        allowedApps: {
          defaultValue: [AllowedApp.ALL],
          input: false,
          type: "string[]",
        },
        role: {
          defaultValue: Role.USER,
          input: false,
          type: objectValues(Role),
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export const toAuthLike = (auth: Auth): AuthLike => ({
  basePath: auth.options.basePath,
  getSession: async (headers, setCookie) => {
    const { headers: set, response: found } = await auth.api.getSession({
      headers,
      returnHeaders: true,
    });
    for (const cookie of set.getSetCookie()) {
      setCookie?.(cookie);
    }
    return (
      found && {
        ...found,
        user: {
          ...found.user,
          allowedApps: allowedAppsFrom(found.user.allowedApps),
          role: roleFrom(found.user.role),
        },
      }
    );
  },
  handler: (request) => auth.handler(request),
  openApi: () => auth.api.generateOpenAPISchema(),
});
