import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { LOCAL } from "../../local/addresses";
import { testRunStamp } from "../run/test-run";
import { E2E_CLI, E2E_LABEL, E2E_TAG } from "./run";

const isCi = Boolean(process.env.CI);
/** Tests tagged for Chromium only, which the WebKit projects leave out. */
const CHROMIUM_ONLY = new RegExp(E2E_TAG.CHROMIUM_ONLY);

/**
 * `next build` runs before the App answers; the API waits for its Test
 * database, whose template a cold run builds first (Liquibase in Docker).
 */
const START_TIMEOUT_MS = 300_000;

/**
 * One stamp per Playwright run, fixed in the main process and inherited by
 * the workers and global teardown: it names the run's Test database and
 * bucket.
 */
process.env.CONFIG_E2E_STAMP ??= testRunStamp();
const STAMP = process.env.CONFIG_E2E_STAMP;
/** Requests, and sign-ins, one e2e run may make; far above any run's need. */
const E2E_RATE_LIMIT_MAX = 10_000;
// `-C`, not `--filter`: a filtered run prints a banner into the captured name.
const cli =
  ({ dir, script }: { dir: string; script: string }) =>
  (command: string) =>
    `pnpm -s -C "${dir}" ${script} ${command} ${E2E_LABEL} ${STAMP}`;
const testDatabase = cli(E2E_CLI.DATABASE);
const testBucket = cli(E2E_CLI.BUCKET);

export const playwrightConfig = defineConfig({
  forbidOnly: isCi,
  fullyParallel: true,
  reporter: isCi ? [["github"], ["html", { open: "never" }]] : "list",
  retries: isCi ? 2 : 0,
  testDir: "./e2e",
  // macOS writes `._name` AppleDouble twins on non-APFS volumes, and
  // Playwright would load `._smoke.spec.ts` as a test file.
  testIgnore: "**/._*",
  use: { trace: "on-first-retry" },
});

/**
 * An App's e2e config: the production build of the App on `port` plus the
 * API on `LOCAL.PORT.API_E2E`, both started for the run and stopped after
 * it. The ports are the same locally and in CI, so a run that passed locally
 * is the run CI would make and Turbo's remote cache can replay it; they sit
 * beside `pnpm dev`. The stack's addresses are set here, so neither CI nor
 * a local `.env` decides them; `env` adds the App's own runtime values.
 * `apiPath` is the API's own `API.PATH`, which config, a leaf package,
 * cannot import.
 */
export const aofPlaywrightConfig = ({
  apiPath,
  app,
  env,
  port,
}: {
  apiPath: { AUTH: string; HEALTH: string };
  app: string;
  env: Record<string, string>;
  port: number;
}) => {
  const baseURL = `http://localhost:${port}`;
  const apiUrl = LOCAL.URL.API_E2E;
  const standalone = `.next/standalone/apps/${app}`;
  return defineConfig(playwrightConfig, {
    // Drops the run's database and bucket.
    globalTeardown: resolve(import.meta.dirname, "global-teardown.ts"),
    // Two engines at two widths: Chromium (Chrome, Edge) and WebKit (Safari,
    // and every browser on iOS), each on a desktop and a phone. One build and
    // one Test database serve all four.
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      {
        grepInvert: CHROMIUM_ONLY,
        name: "webkit",
        use: { ...devices["Desktop Safari"] },
      },
      { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
      {
        grepInvert: CHROMIUM_ONLY,
        name: "mobile-safari",
        use: { ...devices["iPhone 15"] },
      },
    ],
    use: { baseURL },
    webServer: [
      {
        // Playwright starts web servers before global setup, so the API's
        // command makes the run's Test database and bucket.
        // A bare assignment exits with its command's status, so `&&` stops the
        // start at a failed create and shows its own error.
        command: `DB="$(${testDatabase("create")})" && BUCKET="$(${testBucket("create")})" && DATABASE_URL="$DB" STORAGE_BUCKET="$BUCKET" pnpm --filter @allonfire/api start`,
        env: {
          API_CORS_ORIGINS: baseURL,
          // Every project's requests come from one address: the global limit
          // would refuse a run of four browsers. The limiter has its own test.
          API_RATE_LIMIT_MAX: String(E2E_RATE_LIMIT_MAX),
          // Its own Redis database: a run's requests never count against the
          // API `pnpm dev` serves beside it.
          API_REDIS_URL: LOCAL.URL.REDIS_E2E,
          // Fresh sign-in counters each run: the last run's attempts would
          // otherwise still count in Redis.
          AUTH_RATE_LIMIT_KEY_PREFIX: `auth:e2e:${STAMP}:`,
          // Every spec signs in from one address, and CI retries add more;
          // the limit itself is covered by the API's integration test.
          AUTH_RATE_LIMIT_MAX: String(E2E_RATE_LIMIT_MAX),
          AUTH_URL: apiUrl,
          PORT: String(LOCAL.PORT.API_E2E),
          STORAGE_ENDPOINT: LOCAL.URL.STORAGE,
          // The Local image server signs nothing itself: the API signs the
          // links it serves with the same throwaway key and salt.
          STORAGE_IMAGE_SERVER_KEY: LOCAL.IMAGE_SERVER.KEY,
          STORAGE_IMAGE_SERVER_SALT: LOCAL.IMAGE_SERVER.SALT,
          STORAGE_IMAGE_SERVER_URL: LOCAL.URL.IMAGE_SERVER,
        },
        timeout: START_TIMEOUT_MS,
        url: `${apiUrl}${apiPath.HEALTH}`,
      },
      {
        // The API's address is baked into the build, so the App is built
        // for this stack, then served the way the Docker image serves it:
        // the standalone server, with the static files copied beside it.
        // Runs in the App's folder, where this config lives. The bucket is
        // baked into the `/storage/images` rewrite too.
        command: [
          `BUCKET="$(${testBucket("name")})" && STORAGE_BUCKET="$BUCKET" pnpm build`,
          `cp -R .next/static ${standalone}/.next/`,
          `cp -R public ${standalone}/`,
          `node ${standalone}/server.js`,
        ].join(" && "),
        env: {
          ...env,
          API_AUTH_URL: `${apiUrl}${apiPath.AUTH}`,
          API_URL: apiUrl,
          NEXT_PUBLIC_API_URL: apiUrl,
          PORT: String(port),
          STORAGE_ENDPOINT: LOCAL.URL.STORAGE,
        },
        timeout: START_TIMEOUT_MS,
        url: baseURL,
      },
    ],
  });
};
