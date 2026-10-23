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
    ],
  ],
  [
    "apps/back-office/.env.example",
    [
      `NEXT_PUBLIC_API_URL="${LOCAL.URL.API}"`,
      `BACK_OFFICE_URL="${LOCAL.URL.BACK_OFFICE}"`,
      `LAURA_URL="${LOCAL.URL.LAURA}"`,
      `API_URL="${LOCAL.URL.API}"`,
      `STORAGE_ENDPOINT="${LOCAL.URL.STORAGE}"`,
    ],
  ],
  [
    "apps/back-office/package.json",
    [
      `next dev --port ${LOCAL.PORT.BACK_OFFICE}`,
      `next start --port ${LOCAL.PORT.BACK_OFFICE}`,
      `STORAGE_ENDPOINT=\${STORAGE_ENDPOINT:-${LOCAL.URL.STORAGE}}`,
    ],
  ],
  [
    "docker/docker-compose.dev.yml",
    [
      `"${LOCAL.PORT.DATABASE}:5432"`,
      `"${LOCAL.PORT.REDIS}:6379"`,
      `"${LOCAL.PORT.STORAGE}:9000"`,
      `"${LOCAL.PORT.STORAGE_CONSOLE}:9001"`,
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
    ],
  ],
  [
    ".env.example",
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
