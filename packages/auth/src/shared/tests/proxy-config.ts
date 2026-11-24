/**
 * An App's `proxy.ts`, loaded for its matcher alone: the Session refresh and
 * the sign-in gate (each has its own tests in auth) pass the handler through,
 * and the locale middleware does nothing. Vitest hoists a `vi.mock` per test
 * file, so each App's `proxy.test.ts` would repeat the three; this mocks them
 * before it imports the proxy, so the test is `await proxyConfig(() =>
 * import("./proxy"))`.
 */
export const proxyConfig = async <Config>(
  load: () => Promise<{ config: Config }>
): Promise<Config> => {
  vi.doMock("../../features/next/utils/with-session-refresh", () => ({
    withSessionRefresh: (handler: unknown) => handler,
  }));
  vi.doMock("../../features/next/utils/with-sign-in-gate", () => ({
    withSignInGate: (handler: unknown) => handler,
  }));
  vi.doMock(
    "@allonfire/core/features/next/i18n/utils/aof-create-middleware",
    () => ({
      AOFCreateMiddleware: () => () => undefined,
    })
  );
  const { config } = await load();
  return config;
};
