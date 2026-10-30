// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL } from "../addresses";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: exact-text checks, no YAML parser, like local-files.test.ts.
/** The software a service used to be named after; its purpose names it now. */
const OLD_NAMES = [
  "postgres",
  "minio",
  "minio-init",
  "n8n",
  "openobserve",
  "umami",
  "umami-user-init",
  "app-db-init",
  "adminer",
] as const;
const LOCAL_SERVICES = [
  "database",
  "redis",
  "storage",
  "storage-init",
  "workflow",
  "telemetry",
  "analytics",
  "analytics-init",
  "database-init",
  "database-console",
  "image-server",
  "cdn",
] as const;
const STORAGE_MOVE_SERVICE = /^ {2}storage-move:$/m;
const STORAGE_SERVICE = /^ {2}storage:$/m;
const IMAGE_SERVER_SERVICE =
  /^ {2}image-server:\n {4}container_name: allonfire-image-server$/m;
const NOT_FOUND_ELSEWHERE = /location \/ \{\s+return 404;/;
const CDN_SERVICE = /^ {2}cdn:\n {4}container_name: allonfire-cdn$/m;
/** Where each compose file keeps the cdn's nginx config, to its end. */
const CDN_CONFIG = "\nconfigs:\n  cdn:\n";
/** The router for the cdn's public address, `CDN_HOST`. */
const CDN_HOST_KEY = "CDN_HOST";
const CDN_ROUTER = `traefik.http.routers.allonfire-cdn.rule=Host(\`\${${CDN_HOST_KEY}}\`)`;
/** Every file that names a Docker service. */
const FILES = [
  "docker/docker-compose.dev.yml",
  "docker/docker-compose.prod.yml",
  ".husky/pre-commit",
  ".github/workflows/ci.yml",
  "apps/api/package.json",
] as const;

it.each(FILES)("names no service in %s after its software", (file) => {
  const text = read(file);
  for (const name of OLD_NAMES) {
    // A service key, a container, a hostname, a volume, a compose caller.
    expect(text).not.toMatch(new RegExp(`^ {2}${name}:$`, "m"));
    expect(text).not.toMatch(new RegExp(`allonfire-${name}`));
    expect(text).not.toMatch(new RegExp(`\\b${name}:\\d{4}\\b`));
    expect(text).not.toMatch(new RegExp(`\\b${name}_data\\b`));
    expect(text).not.toMatch(
      new RegExp(`(--wait|-d)[^\\n]*\\s${name}(\\s|$)`, "m")
    );
  }
});

it.each(LOCAL_SERVICES)("runs %s Locally under its own name", (name) => {
  expect(read("docker/docker-compose.dev.yml")).toMatch(
    new RegExp(`^ {2}${name}:\\n {4}container_name: allonfire-${name}$`, "m")
  );
});

it("runs Production's storage on its own volume, with no move from the old one", () => {
  const text = read("docker/docker-compose.prod.yml");
  expect(text).not.toMatch(STORAGE_MOVE_SERVICE);
  expect(text).toMatch(STORAGE_SERVICE);
  expect(text).toContain("name: allonfire-storage-data");
  expect(text).toContain(
    "traefik.http.routers.allonfire-storage.rule=Host(`storage.isaiariva.com`)"
  );
  expect(text).toContain("STORAGE_ENDPOINT=http://storage:9000");
  // Deleted from Docker Hub: a deploy could no longer pull it.
  expect(text).not.toContain("minio/minio:latest");
});

it("serves stored pictures in Production through the image server only", () => {
  const text = read("docker/docker-compose.prod.yml");
  expect(text).toMatch(IMAGE_SERVER_SERVICE);
  expect(text).toContain("IMGPROXY_USE_S3=true");
  expect(text).toContain("IMGPROXY_S3_ENDPOINT=http://storage:9000");
});

it("answers the public delivery address from the cdn, never the image server", () => {
  const text = read("docker/docker-compose.prod.yml");
  expect(text).toMatch(CDN_SERVICE);
  const cdn = text.slice(text.search(CDN_SERVICE));
  const server = text.slice(
    text.search(IMAGE_SERVER_SERVICE),
    text.search(CDN_SERVICE)
  );
  expect(cdn).toContain(CDN_ROUTER);
  expect(server).not.toContain("traefik.enable=true");
  expect(text).toContain(
    `STORAGE_IMAGE_SERVER_URL=https://\${CDN_HOST:?CDN_HOST is required}${LOCAL.CDN.PATH.IMAGE}`
  );
});

describe("the cdn's nginx config", () => {
  const config = (file: string) => {
    const text = read(file);
    return text.slice(text.indexOf(CDN_CONFIG));
  };

  it("is the same Locally as in Production", () => {
    expect(config("docker/docker-compose.dev.yml")).toContain(
      "proxy_cache_key"
    );
    expect(config("docker/docker-compose.dev.yml")).toBe(
      config("docker/docker-compose.prod.yml")
    );
  });

  it("hands the image path to the image server, prefix stripped, and 404s the rest", () => {
    const text = config("docker/docker-compose.dev.yml");
    expect(text).toContain(`location ${LOCAL.CDN.PATH.IMAGE}/ {`);
    expect(text).toContain("proxy_pass http://image-server:8080/;");
    expect(text).toMatch(NOT_FOUND_ELSEWHERE);
  });
});
