// @module-tag unit
// @vitest-environment node
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { proxyMatcherSuite } from "@allonfire/core/features/next/i18n/tests/proxy-matcher-suite";
import { config } from "./proxy";

vi.mock("@allonfire/auth/features/next/utils/with-session-refresh", () => ({
  withSessionRefresh: (handler: unknown) => handler,
}));
// The matcher is what this file checks; the gate has its own tests in auth.
vi.mock("@allonfire/auth/features/next/utils/with-sign-in-gate", () => ({
  withSignInGate: (handler: unknown) => handler,
}));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-create-middleware",
  () => ({
    AOFCreateMiddleware: () => () => undefined,
  })
);

proxyMatcherSuite({ config, pages: [AUTH.PAGE.SIGN_IN] });
