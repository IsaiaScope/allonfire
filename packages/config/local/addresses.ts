/**
 * Every address the Local stack and the test stacks use, written once. The
 * files that cannot import it (compose, CI, `.env.example`, scripts' `--port`)
 * are checked against it by `tests/local-files.test.ts`.
 */
const PORT = {
  API: 3300,
  API_E2E: 3310,
  BACK_OFFICE: 3400,
  BACK_OFFICE_E2E: 3410,
  DATABASE: 5432,
  IMAGE_SERVER: 9010,
  LAURA: 3200,
  REDIS: 6379,
  STORAGE: 9000,
  STORAGE_CONSOLE: 9001,
} as const;

/** The Local database's login; compose's defaults. */
const DATABASE = {
  NAME: "allonfire",
  PASSWORD: "allonfire",
  USER: "allonfire",
} as const;

/** The Local storage's login; compose's defaults. */
const STORAGE = {
  ACCESS_KEY: "allonfire",
  SECRET_KEY: "allonfire",
} as const;

/**
 * The Local image server's signing key and salt, hex: throwaway values,
 * compose's defaults, never Production's.
 */
const IMAGE_SERVER = {
  KEY: "5ac692d6a2b19f10fdcdc2f2dd03efdf413a4108bf93d08508e9c4c6656d95f1",
  SALT: "b8d9db70864d2cf60e0b5d06d04b8cb5",
} as const;

const http = (port: number) => `http://localhost:${port}` as const;

const ADDRESS = {
  API: http(PORT.API),
  API_E2E: http(PORT.API_E2E),
  BACK_OFFICE: http(PORT.BACK_OFFICE),
  BACK_OFFICE_E2E: http(PORT.BACK_OFFICE_E2E),
  DATABASE: `postgresql://${DATABASE.USER}:${DATABASE.PASSWORD}@localhost:${PORT.DATABASE}/${DATABASE.NAME}`,
  /** Signed links to stored pictures (imgproxy). */
  IMAGE_SERVER: http(PORT.IMAGE_SERVER),
  LAURA: http(PORT.LAURA),
  /** db 0: rate limits (ADR 0002). */
  REDIS: `redis://localhost:${PORT.REDIS}/0`,
  /** db 15: an e2e run's counters, apart from the ones `pnpm dev` reads. */
  REDIS_E2E: `redis://localhost:${PORT.REDIS}/15`,
  STORAGE: http(PORT.STORAGE),
} as const;

/** The Local stack: `LOCAL.PORT.*`, `LOCAL.URL.*` and the logins compose defaults to. */
export const LOCAL = {
  DATABASE,
  IMAGE_SERVER,
  PORT,
  STORAGE,
  URL: ADDRESS,
} as const;

/** A host that never resolves: MSW answers it, a leak fails. */
export const TEST_API_URL = "http://api.test";
