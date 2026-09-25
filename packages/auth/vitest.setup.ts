// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so no test needs Postgres up.
process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
