// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL } from "../addresses";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: exact-text checks, no YAML parser; a reformatted line fails loudly.
/** The files that cannot import the addresses, and the lines each must hold. */
const EXPECTED: readonly (readonly [string, readonly string[]])[] = [
  [
    // `pnpm dev:tailscale` serves each dev App as its own Tailscale Service
    // (ADR 0021).
    "package.json",
    [
      `--service=svc:back-office --https=443 ${LOCAL.URL.BACK_OFFICE} `,
      `--service=svc:laura --https=443 ${LOCAL.URL.LAURA} `,
    ],
  ],
  [
    ".github/workflows/ci.yml",
    [
      `DATABASE_URL: ${LOCAL.URL.DATABASE}`,
      `API_REDIS_URL: ${LOCAL.URL.REDIS}`,
      `STORAGE_ENDPOINT: ${LOCAL.URL.STORAGE}`,
      `STORAGE_IMAGE_SERVER_URL: ${LOCAL.URL.IMAGE_SERVER}`,
      `STORAGE_IMAGE_SERVER_KEY: ${LOCAL.IMAGE_SERVER.KEY}`,
      `STORAGE_IMAGE_SERVER_SALT: ${LOCAL.IMAGE_SERVER.SALT}`,
    ],
  ],
  [
    "apps/api/.env.example",
    [
      `DATABASE_URL="${LOCAL.URL.DATABASE}"`,
      `API_REDIS_URL="${LOCAL.URL.REDIS}"`,
      `PORT="${LOCAL.PORT.API}"`,
      `AUTH_URL="${LOCAL.URL.API}"`,
      `API_CORS_ORIGINS="${LOCAL.URL.LAURA},${LOCAL.URL.BACK_OFFICE}"`,
      `STORAGE_ENDPOINT="${LOCAL.URL.STORAGE}"`,
      `STORAGE_ACCESS_KEY="${LOCAL.STORAGE.ACCESS_KEY}"`,
      `STORAGE_SECRET_KEY="${LOCAL.STORAGE.SECRET_KEY}"`,
      `STORAGE_IMAGE_SERVER_URL="${LOCAL.URL.IMAGE_SERVER}"`,
      `STORAGE_IMAGE_SERVER_KEY="${LOCAL.IMAGE_SERVER.KEY}"`,
      `STORAGE_IMAGE_SERVER_SALT="${LOCAL.IMAGE_SERVER.SALT}"`,
    ],
  ],
  [
    "apps/back-office/.env.example",
    [
      `NEXT_PUBLIC_API_URL="${LOCAL.URL.API}"`,
      `BACK_OFFICE_URL="${LOCAL.URL.BACK_OFFICE}"`,
      `LAURA_URL="${LOCAL.URL.LAURA}"`,
      `API_URL="${LOCAL.URL.API}"`,
    ],
  ],
  [
    "apps/back-office/package.json",
    [
      `next dev --port ${LOCAL.PORT.BACK_OFFICE}`,
      `next start --port ${LOCAL.PORT.BACK_OFFICE}`,
    ],
  ],
  [
    "docker/docker-compose.dev.yml",
    [
      `"${LOCAL.PORT.DATABASE}:5432"`,
      `"${LOCAL.PORT.REDIS}:6379"`,
      `"${LOCAL.PORT.STORAGE}:9000"`,
      `"${LOCAL.PORT.STORAGE_CONSOLE}:9001"`,
      `"${LOCAL.PORT.CDN}:8080"`,
      `IMGPROXY_KEY: \${STORAGE_IMAGE_SERVER_KEY:-${LOCAL.IMAGE_SERVER.KEY}}`,
      `IMGPROXY_SALT: \${STORAGE_IMAGE_SERVER_SALT:-${LOCAL.IMAGE_SERVER.SALT}}`,
      `POSTGRES_USER: \${POSTGRES_USER:-${LOCAL.DATABASE.USER}}`,
      `POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-${LOCAL.DATABASE.PASSWORD}}`,
      `POSTGRES_DB: \${POSTGRES_DB:-${LOCAL.DATABASE.NAME}}`,
      `MINIO_ROOT_USER: \${STORAGE_ACCESS_KEY:-${LOCAL.STORAGE.ACCESS_KEY}}`,
      `MINIO_ROOT_PASSWORD: \${STORAGE_SECRET_KEY:-${LOCAL.STORAGE.SECRET_KEY}}`,
    ],
  ],
  ["packages/database/.env.example", [`DATABASE_URL="${LOCAL.URL.DATABASE}"`]],
  [
    "packages/storage/.env.example",
    [
      `STORAGE_ENDPOINT="${LOCAL.URL.STORAGE}"`,
      `STORAGE_ACCESS_KEY="${LOCAL.STORAGE.ACCESS_KEY}"`,
      `STORAGE_SECRET_KEY="${LOCAL.STORAGE.SECRET_KEY}"`,
      `STORAGE_IMAGE_SERVER_URL="${LOCAL.URL.IMAGE_SERVER}"`,
      `STORAGE_IMAGE_SERVER_KEY="${LOCAL.IMAGE_SERVER.KEY}"`,
      `STORAGE_IMAGE_SERVER_SALT="${LOCAL.IMAGE_SERVER.SALT}"`,
    ],
  ],
  [
    // Compose reads `.env` beside the compose file, never the repo root's.
    "docker/.env.example",
    [
      `POSTGRES_USER="${LOCAL.DATABASE.USER}"`,
      `POSTGRES_PASSWORD="${LOCAL.DATABASE.PASSWORD}"`,
      `POSTGRES_DB="${LOCAL.DATABASE.NAME}"`,
    ],
  ],
  [
    "apps/laura/.env.example",
    [
      `DATABASE_URL="${LOCAL.URL.DATABASE}"`,
      `BETTER_AUTH_URL="${LOCAL.URL.LAURA}"`,
      `MINIO_ENDPOINT="${LOCAL.URL.STORAGE}"`,
    ],
  ],
  ["apps/laura/package.json", [`next dev --port ${LOCAL.PORT.LAURA}`]],
];

describe.each(EXPECTED)("%s", (path, lines) => {
  it.each(lines)("holds %s", (line) => {
    expect(read(path)).toContain(line);
  });
});

const BUILD_STORAGE = /STORAGE_(ENDPOINT|BUCKET)/;
const DOCKERFILE_STAGE = /^FROM /m;
const TURBO_PIN = /"turbo": "([^"]+)"/;
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const PRUNE_WITH_PINNED_TURBO = `RUN npx "turbo@$(node -p "require('./package.json').devDependencies.turbo")" prune`;
const DEPLOY_BUILD_ARGS = /build-args: \|\n((?: {12}.*\n)+)/;
const TURBO_BUILD_ENV = /"build": \{[^}]*?"env": \[([^\]]*)\]/;

// The Back Office serves no stored file itself (pictures reach the browser
// through the image server, ADR 0027), so its build reads no storage address.
describe("the Back Office build", () => {
  // The pruner, the deps, then the builder.
  const [, , , builderStage] =
    read("docker/Dockerfile").split(DOCKERFILE_STAGE);
  // A split on a capturing pattern holds the capture second; no match, nothing.
  const [, deployBuildArgs] = read(".github/workflows/deploy.yml").split(
    DEPLOY_BUILD_ARGS
  );
  const [, turboBuildEnv] = read("turbo.json").split(TURBO_BUILD_ENV);

  it.each([
    ["the Dockerfile's builder stage", builderStage],
    ["deploy.yml's build-args", deployBuildArgs],
    ["turbo's build env", turboBuildEnv],
    ["the Back Office's .env.example", read("apps/back-office/.env.example")],
    ["the Back Office's scripts", read("apps/back-office/package.json")],
  ])("%s reads no STORAGE_ENDPOINT or STORAGE_BUCKET", (_where, text) => {
    expect(text).toBeTruthy();
    expect(text).not.toMatch(BUILD_STORAGE);
  });
});

// Dokploy's API answers only behind the panel's basic auth, so the address
// carries the login and is a secret, never a variable.
it("reads DOKPLOY_URL from the prod environment's secrets", () => {
  const deploy = read(".github/workflows/deploy.yml");
  const name = "DOKPLOY_URL";
  expect(deploy).toContain(`${name}: \${{ secrets.${name} }}`);
  expect(deploy).not.toContain(`vars.${name}`);
});

describe("the Docker prune", () => {
  // `npx turbo` in the pruner has no node_modules, so it fetched npm's latest
  // turbo, whose pruned turbo.json the builder's locked turbo could not parse.
  it("runs the turbo the lockfile installs, pinned exactly", () => {
    const [, version] = read("package.json").split(TURBO_PIN);
    expect(version).toMatch(EXACT_VERSION);
    expect(read("pnpm-lock.yaml")).toContain(
      `turbo:\n        specifier: ${version}\n        version: ${version}\n`
    );
    expect(read("docker/Dockerfile")).toContain(PRUNE_WITH_PINNED_TURBO);
  });
});
