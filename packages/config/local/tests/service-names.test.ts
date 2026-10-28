// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  "image-cache",
] as const;
const STORAGE_MOVE_SERVICE = /^ {2}storage-move:$/m;
const STORAGE_SERVICE = /^ {2}storage:$/m;
const IMAGE_SERVER_SERVICE =
  /^ {2}image-server:\n {4}container_name: allonfire-image-server$/m;
const IMAGE_CACHE_SERVICE =
  /^ {2}image-cache:\n {4}container_name: allonfire-image-cache$/m;
/** Where each compose file keeps the image cache's nginx config, to its end. */
const IMAGE_CACHE_CONFIG = "\nconfigs:\n  image-cache:\n";
/** The router for the image server's public address, `IMAGE_SERVER_HOST`. */
const IMAGE_SERVER_ROUTER =
  "traefik.http.routers.allonfire-image-server.rule=Host(`$";
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
    // Not `allonfire-minio-data`: the old volume `storage-move` reads.
    expect(text).not.toMatch(new RegExp(`allonfire-${name}(?![\\w-])`));
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

it("moves Production's storage data into its new volume before storage starts", () => {
  const text = read("docker/docker-compose.prod.yml");
  expect(text).toMatch(STORAGE_MOVE_SERVICE);
  expect(text).toMatch(STORAGE_SERVICE);
  expect(text).toContain("name: allonfire-storage-data");
  expect(text).toContain("name: allonfire-minio-data");
  expect(text).toContain(
    "traefik.http.routers.allonfire-storage.rule=Host(`minio.isaiariva.com`)"
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

it("answers the image server's address from the cache in front of it", () => {
  const text = read("docker/docker-compose.prod.yml");
  expect(text).toMatch(IMAGE_CACHE_SERVICE);
  const cache = text.slice(text.search(IMAGE_CACHE_SERVICE));
  const server = text.slice(
    text.search(IMAGE_SERVER_SERVICE),
    text.search(IMAGE_CACHE_SERVICE)
  );
  expect(cache).toContain(IMAGE_SERVER_ROUTER);
  expect(cache).toContain("IMAGE_SERVER_HOST");
  expect(server).not.toContain("traefik.enable=true");
});

it("caches pictures Locally exactly as Production does", () => {
  const config = (file: string) => {
    const text = read(file);
    return text.slice(text.indexOf(IMAGE_CACHE_CONFIG));
  };
  expect(config("docker/docker-compose.dev.yml")).toContain("proxy_cache_key");
  expect(config("docker/docker-compose.dev.yml")).toBe(
    config("docker/docker-compose.prod.yml")
  );
});
