import { LOG_LEVEL } from "./src/shared/constants/runtime";

// env.ts validates at import, so these must exist before any test file loads.
// `??=` keeps real values from CI and the shell authoritative.
process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
process.env.REDIS_URL ??= "redis://localhost:6379/0";
process.env.CORS_ORIGINS ??= "http://localhost:3200";
// Tests exercise failure paths on purpose, so the app logger stays quiet. A
// test that reads log lines back uses `captureLog()`, which logs at debug.
process.env.LOG_LEVEL ??= LOG_LEVEL.SILENT;
