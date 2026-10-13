import { LOCAL } from "@allonfire/config/local/addresses";

// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so no test needs Postgres up.
process.env.DATABASE_URL ??= LOCAL.URL.DATABASE;
// The storage env validates at import too; nothing connects until a request.
process.env.STORAGE_ENDPOINT ??= LOCAL.URL.STORAGE;
process.env.STORAGE_ACCESS_KEY ??= LOCAL.STORAGE.ACCESS_KEY;
process.env.STORAGE_SECRET_KEY ??= LOCAL.STORAGE.SECRET_KEY;
