import { AUTH } from "@allonfire/auth/shared/constants/auth";

/** The Session cookie a read under test sends as the visitor. */
export const SESSION_COOKIE = `${AUTH.COOKIE.SESSION_TOKEN}=token`;

/**
 * Auth's `session-cookie` as a test without Next's request sees it:
 * `vi.mock("@allonfire/auth/features/next/utils/session-cookie", () => import("@/shared/tests/session-cookie-mock"))`.
 */
export const readSessionCookie = vi.fn(async () => SESSION_COOKIE);
