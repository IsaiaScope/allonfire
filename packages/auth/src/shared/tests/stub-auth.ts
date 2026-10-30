import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { AUTH } from "../constants/auth";
import type { AuthLike, AuthSession } from "../types/auth";

const SESSION_TTL_MS = UNIT.MS_PER_MINUTE;

/** Where a made-up host mounts the module in these tests; the module never knows the prefix. */
export const HOST_AUTH_PATH = `/host${AUTH.PATH.BASE}` as const;

/** The cookies a response set, as one `cookie` header a request sends back. */
export const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

/** The same Role in every App, for a test about one Role. */
export const membershipsIn = (role: Role) =>
  objectValues(App).map((app) => ({ app, role }));

/** A signed-in Session; override the user fields a test is about. */
export function sessionFor(
  user: Partial<AuthSession["user"]> = {}
): AuthSession {
  return {
    session: {
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      id: "session-1",
    },
    user: {
      email: "user@allonfire.test",
      id: "user-1",
      memberships: membershipsIn(Role.USER),
      name: "Test User",
      ...user,
    },
  };
}

/** Anonymous, no routes, empty schema, mounted at `/auth` — override what the test needs. */
export function stubAuth(overrides: Partial<AuthLike> = {}): AuthLike {
  return {
    basePath: AUTH.PATH.BASE,
    getSession: () => Promise.resolve(null),
    handler: () => Promise.resolve(new Response(null, { status: 404 })),
    openApi: () => Promise.resolve({ paths: {} }),
    ...overrides,
  };
}
