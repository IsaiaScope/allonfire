/**
 * What a session read's test mocks, one module standing in for each:
 * `vi.mock(path, () => import("./session-request-mocks"))`.
 */

/** The Session cookie the visitor's request carries. */
const COOKIE = "better-auth.session_token=token";

/** next/headers: the visitor's cookies and headers. */
export const cookies = async () => ({ toString: () => COOKIE });
export const headers = async () => new Headers({ cookie: COOKIE });

/**
 * Core's forwarded-for: core may resolve its own copy of `next`, which a
 * next/headers mock never reaches, so the visitor's headers come from here.
 */
export const readVisitorHeaders = async () => ({ cookie: COOKIE });
