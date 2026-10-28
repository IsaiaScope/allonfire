import { LOCAL } from "@allonfire/config/local/addresses";
import { LOG } from "@allonfire/core/features/logger/constants/logger";

// env.ts validates at import, so these must exist before any test file loads.
// `??=` keeps real values from CI and the shell authoritative.
process.env.DATABASE_URL ??= LOCAL.URL.DATABASE;
process.env.API_REDIS_URL ??= LOCAL.URL.REDIS;
process.env.API_CORS_ORIGINS ??= LOCAL.URL.LAURA;
process.env.AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.AUTH_URL ??= LOCAL.URL.API;
process.env.STORAGE_ENDPOINT ??= LOCAL.URL.STORAGE;
process.env.STORAGE_ACCESS_KEY ??= LOCAL.STORAGE.ACCESS_KEY;
process.env.STORAGE_SECRET_KEY ??= LOCAL.STORAGE.SECRET_KEY;
process.env.STORAGE_IMAGE_SERVER_URL ??= LOCAL.URL.IMAGE_SERVER;
process.env.STORAGE_IMAGE_SERVER_KEY ??= LOCAL.IMAGE_SERVER.KEY;
process.env.STORAGE_IMAGE_SERVER_SALT ??= LOCAL.IMAGE_SERVER.SALT;
// Tests exercise failure paths on purpose, so the app logger stays quiet. A
// test that reads log lines back uses `captureLog()`, which logs at debug.
process.env.API_LOG_LEVEL ??= LOG.LEVEL.SILENT;
