import type { App, Role } from "@allonfire/database/enums";
import { AUTH } from "../../../shared/constants/auth";
import type { Session } from "../utils/auth-client";

/**
 * What a session read's test mocks, one module standing in for each:
 * `vi.mock(path, () => import("./session-request-mocks"))`, and the API's
 * answer to it (`apiSends`).
 */

/** The Session cookie the visitor's request carries. */
const COOKIE = `${AUTH.COOKIE.SESSION_TOKEN}=token`;

/** next/headers: the visitor's cookies and headers. */
export const cookies = async () => ({ toString: () => COOKIE });
export const headers = async () => new Headers({ cookie: COOKIE });

/**
 * Core's visitor-headers: core may resolve its own copy of `next`, which a
 * next/headers mock never reaches, so the visitor's headers come from here.
 */
export const readVisitorHeaders = async () => ({ cookie: COOKIE });

/**
 * The API answers `get-session` with a User holding these Memberships, or
 * with no Session (`null`). Returns the fetch mock, to see what was asked.
 */
export const apiSends = (memberships: { app: App; role: Role }[] | null) => {
  const fetch = vi.fn(async () =>
    Response.json(
      memberships && {
        session: { id: "session-1" },
        user: { email: "someone@example.com", memberships },
      }
    )
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

/** A Session as the API client types it, for a User holding `memberships`. */
export const sessionOf = (memberships: { app: App; role: Role }[]): Session => {
  const now = new Date();
  return {
    session: {
      createdAt: now,
      expiresAt: now,
      id: "session-1",
      token: "token",
      updatedAt: now,
      userId: "user-1",
    },
    user: {
      createdAt: now,
      email: "someone@example.com",
      emailVerified: true,
      id: "user-1",
      image: null,
      imageBlurDataUrl: null,
      memberships,
      name: "Someone",
      updatedAt: now,
    },
  };
};
