import { prisma } from "@allonfire/database";
import { canEnterApp } from "@allonfire/database/features/auth/access/access";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { customSession, openAPI } from "better-auth/plugins";
import { AUTH } from "../../shared/constants/auth";
import type { AuthLike } from "../../shared/types/auth";
import {
  type AvatarLink,
  linkedPicture,
} from "../../shared/utils/linked-picture";
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
  /**
   * What a browser gets for `User.image` in the Session: the Host signs a
   * stored Avatar's name into a link; none, and the column is answered as it
   * is.
   */
  avatarLink?: AvatarLink | undefined;
};

/**
 * `User.imageBlurDataUrl`, read for the Session only: the User module sets it
 * with `User.image`, never a sign-up or anything a client sends. Passed to
 * `customSession` too, which reads a field only from the options it is given.
 */
const USER_OPTIONS = {
  additionalFields: {
    imageBlurDataUrl: { input: false, required: false, type: "string" },
  },
} as const satisfies BetterAuthOptions["user"];

/** A User's Memberships, as the access rules read them. */
const membershipsOf = (userId: string) =>
  prisma.membership.findMany({
    select: { app: true, role: true },
    where: { userId },
  });

/**
 * Who enters an App and who registers comes from `ACCESS.APP_SETTINGS` alone, the
 * table every guard and every App reads too (ADR 0019).
 */
export function createAuth({
  avatarLink = (image) => image,
  cookieDomain,
  ...options
}: CreateAuthOptions) {
  return betterAuth({
    ...options,
    ...(cookieDomain && {
      advanced: {
        crossSubDomainCookies: { domain: cookieDomain, enabled: true },
      },
    }),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    databaseHooks: {
      session: {
        create: {
          // A sign-in naming an App is refused here: after the password
          // check, before the Session is written or its cookies are set, so
          // a refusal leaves nothing to undo.
          before: async (session, ctx) => {
            if (
              ctx?.path !== AUTH.PATH.SIGN_IN_EMAIL ||
              !ctx.headers?.has(AUTH.HEADER.APP)
            ) {
              return;
            }
            const app = namedApp(ctx.headers);
            if (
              app &&
              canEnterApp(
                { memberships: await membershipsOf(session.userId) },
                app
              )
            ) {
              return;
            }
            throw new APIError("FORBIDDEN", {
              code: AUTH.ERROR_CODE.APP_FORBIDDEN,
              message: "This App does not let this User in",
            });
          },
        },
      },
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
          // place a row is written, so the one place that must refuse. An
          // email sign-up keeps no picture it sent: `User.image` names a
          // stored Avatar only an Admin sets; a provider's own stays.
          before: (user, ctx) =>
            registrationFor(ctx?.headers)
              ? Promise.resolve({
                  data:
                    ctx?.path === AUTH.PATH.SIGN_UP_EMAIL
                      ? { ...user, image: null }
                      : user,
                })
              : Promise.reject(registrationClosed()),
        },
      },
    },
    disabledPaths: [
      AUTH.PATH.OPENAPI_SCHEMA,
      AUTH.PATH.UPDATE_USER,
      AUTH.PATH.VERIFY_PASSWORD,
    ],
    emailAndPassword: { enabled: true },
    hooks: {
      // Refused before Better Auth looks the email up: a closed App never
      // tells whether an account exists.
      before: createAuthMiddleware((ctx) =>
        ctx.path === AUTH.PATH.SIGN_UP_EMAIL && !registrationFor(ctx.headers)
          ? Promise.reject(registrationClosed())
          : Promise.resolve()
      ),
    },
    plugins: [
      openAPI({ disableDefaultReference: true }),
      customSession(
        async ({ session, user }) => ({
          session,
          user: {
            ...user,
            ...linkedPicture(
              {
                image: user.image ?? null,
                imageBlurDataUrl: user.imageBlurDataUrl ?? null,
              },
              avatarLink
            ),
            memberships: await membershipsOf(user.id),
          },
        }),
        { user: USER_OPTIONS }
      ),
      joinApp,
    ],
    // The host rate-limits with its own shared store; Better Auth's default is
    // per-process memory and does not know the proxy hop count.
    rateLimit: { enabled: false },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: AUTH.SESSION.COOKIE_CACHE_MAX_AGE_S,
      },
      expiresIn: AUTH.SESSION.EXPIRES_IN_S,
      updateAge: AUTH.SESSION.UPDATE_AGE_S,
    },
    user: USER_OPTIONS,
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
