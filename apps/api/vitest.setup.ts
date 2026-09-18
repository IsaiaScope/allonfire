// env.ts validates at import, so these must exist before any test file loads.
// `??=` keeps real values from CI and the shell authoritative.
process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
process.env.REDIS_URL ??= "redis://localhost:6379/0";
process.env.CORS_ORIGINS ??= "http://localhost:3200";
// debug so probe log lines are actually emitted for src/app.test.ts to filter.
process.env.LOG_LEVEL ??= "debug";
