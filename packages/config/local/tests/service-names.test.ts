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
] as const;
const STORAGE_MOVE_SERVICE = /^ {2}storage-move:$/m;
const STORAGE_SERVICE = /^ {2}storage:$/m;
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
