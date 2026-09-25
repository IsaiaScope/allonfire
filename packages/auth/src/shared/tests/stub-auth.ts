import { AllowedApp, Role } from "@allonfire/database/enums";
import { AUTH_PATH } from "../constants/paths";
import type { AuthLike, AuthSession } from "../types/auth";

const SESSION_TTL_MS = 60_000;

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
      allowedApps: [AllowedApp.ALL],
      email: "user@allonfire.test",
      id: "user-1",
      name: "Test User",
      role: Role.USER,
      ...user,
    },
  };
}

/** Anonymous, no routes, empty schema, mounted at `/auth` — override what the test needs. */
export function stubAuth(overrides: Partial<AuthLike> = {}): AuthLike {
  return {
    basePath: AUTH_PATH,
    getSession: () => Promise.resolve(null),
    handler: () => Promise.resolve(new Response(null, { status: 404 })),
    openApi: () => Promise.resolve({ paths: {} }),
    ...overrides,
  };
}
