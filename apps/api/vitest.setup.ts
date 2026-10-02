import { LOG_LEVEL } from "@allonfire/utils/constants/logger";

// env.ts validates at import, so these must exist before any test file loads.
// `??=` keeps real values from CI and the shell authoritative.
process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
process.env.API_REDIS_URL ??= "redis://localhost:6379/0";
process.env.API_CORS_ORIGINS ??= "http://localhost:3200";
process.env.AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.AUTH_URL ??= "http://localhost:3300";
process.env.STORAGE_ENDPOINT ??= "http://localhost:9000";
process.env.STORAGE_ACCESS_KEY ??= "allonfire";
process.env.STORAGE_SECRET_KEY ??= "allonfire";
// Tests exercise failure paths on purpose, so the app logger stays quiet. A
// test that reads log lines back uses `captureLog()`, which logs at debug.
process.env.API_LOG_LEVEL ??= LOG_LEVEL.SILENT;
