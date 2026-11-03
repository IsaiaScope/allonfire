import { LOCAL } from "@allonfire/config/local/addresses";
import { LOG } from "@allonfire/core/features/logger/constants/logger";
import { fillLocalDatabaseEnv } from "@allonfire/database/features/test-database/local-env";
import { fillLocalStorageEnv } from "@allonfire/storage/features/test-bucket/local-env";

// env.ts validates at import, so these must exist before any test file loads.
// `??=` keeps real values from CI and the shell authoritative.
fillLocalDatabaseEnv();
fillLocalStorageEnv();
process.env.API_REDIS_URL ??= LOCAL.URL.REDIS;
process.env.API_CORS_ORIGINS ??= LOCAL.URL.LAURA;
process.env.AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.AUTH_URL ??= LOCAL.URL.API;
// Tests exercise failure paths on purpose, so the app logger stays quiet. A
// test that reads log lines back uses `captureLog()`, which logs at debug.
process.env.API_LOG_LEVEL ??= LOG.LEVEL.SILENT;
