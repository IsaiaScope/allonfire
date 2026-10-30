import createMiddleware from "next-intl/middleware";

/**
 * An App's proxy: next-intl routes the locale. A step before it (Session
 * refresh) wraps the returned proxy. The App's `config.matcher` stays a
 * literal in its proxy.ts: Next reads it statically.
 */
export const AOFCreateMiddleware = createMiddleware;
