import { HTTP_HEADER } from "@allonfire/core/features/http/constants/http";
import { prisma } from "@allonfire/database";
import { canEnterApp } from "@allonfire/database/features/auth/access/access";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { customSession, openAPI } from "better-auth/plugins";
import { AUTH_ERROR_CODE } from "../../shared/constants/errors";
import { APP_HEADER } from "../../shared/constants/headers";
import {
  COOKIE_CACHE_MAX_AGE_S,
  SESSION_EXPIRES_IN_S,
  SESSION_UPDATE_AGE_S,
} from "../../shared/constants/limits";
import {
  OPENAPI_SCHEMA_PATH,
  SIGN_IN_EMAIL_PATH,
  SIGN_UP_EMAIL_PATH,
} from "../../shared/constants/paths";
import type { AuthLike } from "../../shared/types/auth";
import { joinApp } from "./routes/join-app";
import {
  namedApp,
  registrationClosed,
  registrationFor,
} from "./utils/registration";

export type CreateAuthOptions = {
  secret: string;
  /** Public origin the host is reached at. */
  baseURL: string;
  /** Where the host mounted the routes, e.g. `/v1/auth`. */
  basePath: string;
  /** Browser origins allowed to send cookie-bearing requests. */
  trustedOrigins: string[];
  /**
   * The parent domain shared by the API and the Apps: the Session cookies are
   * set for it, so a browser sends them straight to the API. None: the host's
   * own domain only.
   */
  cookieDomain?: string | undefined;
};

/** A User's Memberships, as the access rules read them. */
const membershipsOf = (userId: string) =>
  prisma.membership.findMany({
    select: { app: true, role: true },
    where: { userId },
  });

/**
 * Who enters an App and who registers comes from `APP_SETTINGS` alone, the
 * table every guard and every App reads too (ADR 0019).
 */
export function createAuth({ cookieDomain, ...options }: CreateAuthOptions) {
  return betterAuth({
    ...options,
    ...(cookieDomain && {
      advanced: {
        crossSubDomainCookies: { domain: cookieDomain, enabled: true },
      },
    }),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    databaseHooks: {
      user: {
        create: {
          // Better Auth runs this after the User's transaction commits, so a
          // failed insert takes the User back out (their Account and Session
          // go with it): no User without a Membership, no email left taken.
          after: async (user, ctx) => {
            const registration = registrationFor(ctx?.headers);
            if (!registration) {
              return;
            }
            try {
              await prisma.membership.create({
                data: { ...registration, userId: user.id },
              });
            } catch (error) {
              await prisma.user.delete({ where: { id: user.id } });
              throw error;
            }
          },
          // Every User a request creates goes through Registration: the one
          // place a row is written, so the one place that must refuse.
          before: (user, ctx) =>
            registrationFor(ctx?.headers)
              ? Promise.resolve({ data: user })
              : Promise.reject(registrationClosed()),
        },
      },
    },
    disabledPaths: [OPENAPI_SCHEMA_PATH],
    emailAndPassword: { enabled: true },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const session = ctx.context.newSession;
        if (
          ctx.path !== SIGN_IN_EMAIL_PATH ||
          !session ||
          !ctx.headers?.has(APP_HEADER)
        ) {
          return;
        }
        const app = namedApp(ctx.headers);
        const memberships = await membershipsOf(session.user.id);
        if (app && canEnterApp({ memberships }, app)) {
          return;
        }
        // The Session just opened must not outlive the refusal, in the
        // database or in the cookie cache. Better Auth keeps the sign-in's
        // cookies on an after hook's error, so they are dropped first.
        await ctx.context.internalAdapter.deleteSession(session.session.token);
        ctx.context.responseHeaders?.delete(HTTP_HEADER.SET_COOKIE);
        deleteSessionCookie(ctx);
        throw new APIError("FORBIDDEN", {
          code: AUTH_ERROR_CODE.APP_FORBIDDEN,
          message: "This App does not let this User in",
        });
      }),
      // Refused before Better Auth looks the email up: a closed App never
      // tells whether an account exists.
      before: createAuthMiddleware((ctx) =>
        ctx.path === SIGN_UP_EMAIL_PATH && !registrationFor(ctx.headers)
          ? Promise.reject(registrationClosed())
          : Promise.resolve()
      ),
    },
    plugins: [
      openAPI({ disableDefaultReference: true }),
      customSession(async ({ session, user }) => ({
        session,
        user: { ...user, memberships: await membershipsOf(user.id) },
      })),
      joinApp,
    ],
    // The host rate-limits with its own shared store; Better Auth's default is
    // per-process memory and does not know the proxy hop count.
    rateLimit: { enabled: false },
    session: {
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_S },
      expiresIn: SESSION_EXPIRES_IN_S,
      updateAge: SESSION_UPDATE_AGE_S,
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
    return found && { session: found.session, user: found.user };
  },
  handler: (request) => auth.handler(request),
  openApi: () => auth.api.generateOpenAPISchema(),
});
