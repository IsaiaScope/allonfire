import { UNIT } from "@allonfire/core/shared/constants/units";
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { verifyEmailIssuedAt } from "@allonfire/database/features/auth/user.service";
import type { BetterAuthOptions } from "better-auth";
import { BASE_ERROR_CODES } from "better-auth";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";

/**
 * The emails the module asks its host to send. Each runs after the response
 * (`advanced.backgroundTasks`), so neither its time nor its failure tells a
 * caller whether an account exists.
 */
export type AuthMail = {
  /** Sends the link that verifies `email`. */
  sendVerification: (
    message: { email: string; url: string },
    request: Request | undefined
  ) => Promise<void>;
  /**
   * Sends a reset link: the App's page `redirectTo` with the token, never
   * the API's own reset route, whose path a request log records.
   */
  sendPasswordReset: (
    message: { email: string; token: string; redirectTo: string | null },
    request: Request | undefined
  ) => Promise<void>;
  /** Whether the per-address limit can count now; false refuses every sending route. */
  ready: () => Promise<boolean>;
};

/** What a verification token says of itself; Better Auth checked its signature first. */
const claimsSchema = z.object({ email: z.email(), iat: z.number() });

const claimsOf = (token: unknown) => {
  if (typeof token !== "string") {
    return null;
  }
  const [, payload = ""] = token.split(".");
  try {
    return parseJsonWith(
      Buffer.from(payload, "base64url").toString("utf8"),
      claimsSchema
    );
  } catch {
    return null;
  }
};

/** Where a reset link sends the User: the `redirectTo` Better Auth checked against the trusted origins. */
const redirectOf = (url: string): string | null =>
  new URL(url).searchParams.get("callbackURL") || null;

/**
 * Better Auth's verification and reset, wired to the host's mail: verified
 * email required to sign in (a correct password sends a fresh link), links
 * valid for an hour, and a reset that ends every Session of the User.
 */
export const mailOptions = (mail: AuthMail) =>
  ({
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: AUTH.MAIL.LINK_EXPIRES_IN_S,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ token, url, user }, request) =>
        mail.sendPasswordReset(
          { email: user.email, redirectTo: redirectOf(url), token },
          request
        ),
    },
    emailVerification: {
      expiresIn: AUTH.MAIL.LINK_EXPIRES_IN_S,
      sendOnSignIn: true,
      sendVerificationEmail: ({ url, user }, request) =>
        mail.sendVerification({ email: user.email, url }, request),
    },
  }) as const satisfies Pick<
    BetterAuthOptions,
    "emailAndPassword" | "emailVerification"
  >;

type UpdateBefore = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<BetterAuthOptions["databaseHooks"]>["user"]
    >["update"]
  >["before"]
>;

/**
 * Replaces Better Auth's "verified" write on `/verify-email` with one that
 * holds only when no Admin required verification after the link was issued,
 * in the same statement: an older link never satisfies a newer requirement.
 * Answering false skips Better Auth's own write.
 */
export const verifyIssuedLink: UpdateBefore = async (data, ctx) => {
  if (ctx?.path !== AUTH.PATH.VERIFY_EMAIL || data.emailVerified !== true) {
    return;
  }
  const claims = claimsOf(ctx.query?.token);
  const verified =
    claims !== null &&
    (await verifyEmailIssuedAt(
      claims.email,
      new Date(claims.iat * UNIT.MS_PER_SECOND)
    ));
  if (verified) {
    return false;
  }
  const callbackURL = ctx.query?.callbackURL;
  if (typeof callbackURL === "string" && callbackURL) {
    // Spelled as Better Auth spells its own, a relative callback included.
    const joiner = callbackURL.includes("?") ? "&" : "?";
    throw ctx.redirect(
      `${callbackURL}${joiner}${AUTH.MAIL.ERROR_PARAM}=${BASE_ERROR_CODES.INVALID_TOKEN.code}`
    );
  }
  throw new APIError("UNAUTHORIZED", {
    code: BASE_ERROR_CODES.INVALID_TOKEN.code,
    message: "This link was replaced by a newer one",
  });
};

/** Refuses a sending route before any lookup while the per-address limit cannot count. */
export const refuseWhileLimitDown = async (mail: AuthMail, path: string) => {
  const sends = AUTH.MAIL.SENDING_PATHS.some((sending) => sending === path);
  if (sends && !(await mail.ready())) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: AUTH.ERROR_CODE.MAIL_UNAVAILABLE,
      message: "Email is unavailable right now; try again later",
    });
  }
};
