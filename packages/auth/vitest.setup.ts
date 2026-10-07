// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so no test needs Postgres up.
// features/next reads which App it serves at import.
process.env.AUTH_APP ??= "BACK_OFFICE";
process.env.AUTH_MIN_ROLE ??= "ADMIN";
process.env.API_URL ??= "http://api.test";
process.env.API_AUTH_URL ??= "http://api.test/auth";
process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
