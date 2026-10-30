// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: exact-text checks, no YAML parser, like service-names.test.ts.
const COMPOSE = read("docker/docker-compose.prod.yml");

/** `${expr}` as compose writes it. */
const interpolate = (expr: string) => `\${${expr}}`;
/** `${KEY:?KEY is required}`: compose refuses to start without KEY. */
const required = (key: string) => interpolate(`${key}:?${key} is required`);
const PORTS = /^ {4}ports:/m;
const BROAD_GRANT = /arn:aws:s3:::\*|arn:aws:s3:::image/;

/** A service key, or a top-level key such as `volumes:`. */
const NEXT_KEY = /^ {2}[a-z-]+:$|^[a-z]+:$/m;
const REQUIRED_KEY = /\$\{([A-Z_]+):\?/g;
const STORAGE_KEY = /- (STORAGE_[A-Z_]+)=/g;

/** One service's block: from its key to the next top-level service key. */
const service = (name: string) => {
  const start = COMPOSE.search(new RegExp(`^ {2}${name}:$`, "m"));
  if (start === -1) {
    throw new Error(`docker-compose.prod.yml has no service ${name}`);
  }
  const rest = COMPOSE.slice(start + 1);
  const end = rest.search(NEXT_KEY);
  return rest.slice(0, end === -1 ? undefined : end);
};

/** Every `${KEY:?…}` the compose requires, so a deploy cannot start without it. */
const REQUIRED = [...COMPOSE.matchAll(REQUIRED_KEY)].map(([, key]) => key);
const EXAMPLES = [
  "docker/.env.example",
  "apps/api/.env.example",
  "apps/back-office/.env.example",
  "packages/database/.env.example",
  "packages/storage/.env.example",
].map(read);
/** A key's line, set or commented out (production-only keys are commented). */
const exampleLine = (key: string) => new RegExp(`^(# )?${key}=`, "m");

describe("telemetry", () => {
  const telemetry = service("telemetry");

  it.each([
    "image: openobserve/openobserve:v1.0.3",
    "mem_limit: 768m",
    "- telemetry_data:/data",
    "ZO_DATA_DIR: /data",
    "ZO_LOCAL_MODE_STORAGE: s3",
    "ZO_S3_PROVIDER: minio",
    "ZO_S3_SERVER_URL: http://storage:9000",
    "ZO_S3_REGION_NAME: us-east-1",
    "ZO_S3_BUCKET_NAME: telemetry",
    `ZO_S3_ACCESS_KEY: ${required("TELEMETRY_STORAGE_ACCESS_KEY")}`,
    `ZO_S3_SECRET_KEY: ${required("TELEMETRY_STORAGE_SECRET_KEY")}`,
    `ZO_ROOT_USER_EMAIL: ${required("TELEMETRY_ROOT_EMAIL")}`,
    `ZO_ROOT_USER_PASSWORD: ${required("TELEMETRY_ROOT_PASSWORD")}`,
    'ZO_COMPACT_DATA_RETENTION_DAYS: "14"',
    "ZO_WEB_URL: https://observe.isaiariva.com",
    'ZO_COOKIE_SECURE_ONLY: "true"',
    'ZO_TELEMETRY: "false"',
    'ZO_MEMORY_CIRCUIT_BREAKER_ENABLED: "true"',
    'ZO_MEM_TABLE_MAX_SIZE: "128"',
    'ZO_MEMORY_CACHE_DATAFUSION_MAX_SIZE: "192"',
    "telemetry-init:\n        condition: service_completed_successfully",
    "traefik.http.routers.allonfire-telemetry.rule=Host(`observe.isaiariva.com`)",
    "traefik.http.routers.allonfire-telemetry.entrypoints=websecure",
    "traefik.http.routers.allonfire-telemetry.tls.certresolver=letsencrypt",
    "traefik.http.routers.allonfire-telemetry.middlewares=admin-gate@file",
    "traefik.http.services.allonfire-telemetry.loadbalancer.server.port=5080",
  ])("holds %s", (line) => {
    expect(telemetry).toContain(line);
  });

  it("publishes no port: ingest stays on the internal network", () => {
    expect(telemetry).not.toMatch(PORTS);
  });

  it("keeps its data in a named volume", () => {
    expect(COMPOSE).toContain(
      "  telemetry_data:\n    name: allonfire-telemetry-data"
    );
  });
});

describe("telemetry-init", () => {
  const init = service("telemetry-init");

  it.each([
    "image: ghcr.io/coollabsio/minio:",
    "storage:\n        condition: service_healthy",
    "mc mb --ignore-existing local/telemetry",
    "mc admin user add local",
    "mc admin policy attach local telemetry --user",
    '"Resource":["arn:aws:s3:::telemetry","arn:aws:s3:::telemetry/*"]',
  ])("holds %s", (line) => {
    expect(init).toContain(line);
  });

  it("grants OpenObserve's user its bucket only", () => {
    expect(init).not.toMatch(BROAD_GRANT);
  });
});

describe("redis", () => {
  const redis = service("redis");

  it.each([
    "image: redis:7-alpine",
    "mem_limit: 128m",
    "--appendonly yes",
    "- redis_data:/data",
  ])("holds %s", (line) => {
    expect(redis).toContain(line);
  });

  it("stays on the internal network", () => {
    expect(redis).not.toContain("dokploy-network");
    expect(redis).not.toContain("traefik.enable");
  });

  it("is the API's Redis", () => {
    expect(service("api")).toContain("API_REDIS_URL=redis://redis:6379");
    expect(service("api")).toContain(
      "redis:\n        condition: service_healthy"
    );
  });
});

describe.each([
  ["api", "allonfire-api"],
  ["back-office", "allonfire-back-office"],
])("%s's telemetry", (name, serviceName) => {
  it("is wired, and stays off until the ingest account's headers are set", () => {
    const block = service(name);
    expect(block).toContain(
      `TELEMETRY_ENDPOINT=${interpolate("TELEMETRY_HEADERS:+http://telemetry:5080/api/default")}`
    );
    expect(block).toContain(
      `TELEMETRY_HEADERS=${interpolate("TELEMETRY_HEADERS:-")}`
    );
    expect(block).toContain(`TELEMETRY_SERVICE_NAME=${serviceName}`);
  });
});

it("reads the API's proxy hops from Dokploy, one (Traefik) by default", () => {
  // Cloudflare's proxy adds a hop: raising it is an env edit, not a deploy.
  expect(service("api")).toContain(
    `API_TRUSTED_PROXY_HOPS=${interpolate("API_TRUSTED_PROXY_HOPS:-1")}`
  );
});

it("serves the storage console at storage.isaiariva.com", () => {
  expect(service("storage")).toContain(
    "traefik.http.routers.allonfire-storage.rule=Host(`storage.isaiariva.com`)"
  );
});

it.each(REQUIRED)(
  "%s, which the compose requires, has a .env.example line",
  (key) => {
    expect(EXAMPLES.some((text) => exampleLine(key).test(text))).toBe(true);
  }
);

it("gives storage-setup every storage key the API gets: both load the storage package's env", () => {
  const keys = (name: string) =>
    [...service(name).matchAll(STORAGE_KEY)]
      .map(([, key]) => key)
      .sort((a, b) => a.localeCompare(b));
  expect(keys("storage-setup")).toEqual(keys("api"));
});
