import type { Instrumentation } from "next";

/**
 * A Next App's `register`, re-exported by its `src/instrumentation.ts`: runs
 * once when the server starts. On the Node runtime only (the SDK is
 * Node's), it starts OpenTelemetry, which does nothing without
 * `TELEMETRY_ENDPOINT`. `"nodejs"` stays a literal: Next replaces
 * `process.env.NEXT_RUNTIME` at build and drops the other runtime's branch.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startTelemetry } = await import("./instrumentation.node");
    startTelemetry();
  }
}

/**
 * Every error the server catches answering a request (a page, a route, a
 * server action, the proxy) reaches the server log, and through it the
 * collector when telemetry is on. The logger is pino's, so Node's only.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const [{ serverLogger }, { LOG }] = await Promise.all([
    import("../logger/server-logger"),
    import("../../logger/constants/logger"),
  ]);
  serverLogger().error(
    { err, path: request.path, routeType: context.routeType },
    LOG.MESSAGE.REQUEST_FAILED
  );
};
