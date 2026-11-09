import { LOCAL } from "@allonfire/config/local/addresses";

/**
 * Fills an unset `DATABASE_URL` with the Local database, for a test setup:
 * the database env validates at import, and the Prisma client never connects
 * until a query runs. `??=` keeps a value CI or the shell set.
 */
export function fillLocalDatabaseEnv(): void {
  process.env.DATABASE_URL ??= LOCAL.URL.DATABASE;
}
