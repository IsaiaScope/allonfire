// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: exact-text checks, no shell parser, like service-names.test.ts.
/** What runs in the VPS's /opt/backups/scripts, and the template of its .env. */
const VPS = {
  backup: "vps/backup.sh",
  envExample: "vps/.env.example",
  restoreTest: "vps/restore-test.sh",
  snapshot: "vps/hetzner-snapshot.sh",
} as const;
const SCRIPTS = [VPS.backup, VPS.restoreTest, VPS.snapshot] as const;
/** Every key the scripts read before they took their owner's prefix. */
const OLD_KEYS = [
  "AWS_S3_BUCKET",
  "AGE_PUBLIC_KEY",
  "AGE_PRIVATE_KEY_PATH",
  "PG_CONTAINER_PATTERN",
  "PG_USER",
  "N8N_CONTAINER_PATTERN",
  "N8N_WEBHOOK_URL",
  "DOKPLOY_PG_CONTAINER_PATTERN",
  "DOKPLOY_PG_USER",
  "DOKPLOY_PG_DATABASE",
  "HETZNER_SERVER_ID",
  "ACME_JSON_PATH",
  "LOCAL_RETENTION_DAYS",
  "KEEP_SNAPSHOTS",
] as const;
/** The hcloud CLI's own variable: the snapshot script hands it the token. */
const HCLOUD_HANDOFF = 'export HCLOUD_TOKEN="$BACKUP_HCLOUD_TOKEN"';
const HCLOUD_TOKEN = /(?<![A-Z_])HCLOUD_TOKEN\b/;
const EVERY_HCLOUD_TOKEN = new RegExp(HCLOUD_TOKEN.source, "g");
const ENV_KEY = /^([A-Z][A-Z0-9_]*)=/gm;
const REQUIRED_KEY = /\$\{([A-Z][A-Z0-9_]*):\?/g;
const OWNER_PREFIX = /^BACKUP_/;

const envKeys = () =>
  [...read(VPS.envExample).matchAll(ENV_KEY)].map(([, key]) => key);

it("prefixes every key of the backups .env with its owner", () => {
  const keys = envKeys();
  expect(keys.length).toBeGreaterThan(0);
  for (const key of keys) {
    expect(key).toMatch(OWNER_PREFIX);
  }
});

it.each([...SCRIPTS, VPS.envExample])(
  "reads no pre-rename key in %s",
  (file) => {
    const text = read(file);
    for (const key of OLD_KEYS) {
      expect(text).not.toMatch(new RegExp(`(?<![A-Z_])${key}\\b`));
    }
  }
);

it.each(SCRIPTS)("finds every key %s requires in .env.example", (file) => {
  const keys = envKeys();
  for (const [, key] of read(file).matchAll(REQUIRED_KEY)) {
    expect(keys).toContain(key);
  }
});

it("hands hcloud its token only from BACKUP_HCLOUD_TOKEN", () => {
  const text = read(VPS.snapshot);
  expect(text).toContain(HCLOUD_HANDOFF);
  expect(text.match(EVERY_HCLOUD_TOKEN)).toHaveLength(1);
  for (const file of [VPS.backup, VPS.restoreTest, VPS.envExample]) {
    expect(read(file)).not.toMatch(HCLOUD_TOKEN);
  }
});

it("finds storage by its purpose name", () => {
  const text = read(VPS.backup);
  expect(text).toContain('find_container "$BACKUP_STORAGE_CONTAINER_PATTERN"');
  expect(text).not.toContain('find_container "minio"');
});

it("backs up the agent's state and verifies it on restore", () => {
  expect(read(VPS.backup)).toContain('record_component "agent-state"');
  expect(read(VPS.restoreTest)).toContain('verify_component "agent-state"');
});

/** What the agent rebuilds on its own: 2.5 of its 2.6 GB on 2026-11-02. */
const AGENT_CACHES = ["hf", "pylibs", ".uv-cache", "home", "cache"] as const;

const AGENT_CACHES_LINE = /^AGENT_CACHES=\(([^)]*)\)$/m;

it.each(AGENT_CACHES)(
  "leaves the agent's %s cache out of its backup",
  (dir) => {
    const [, list = ""] = read(VPS.backup).match(AGENT_CACHES_LINE) ?? [];
    expect(list.split(" ")).toContain(dir);
  }
);

it("accepts tar's changed-file warning for the agent's live databases", () => {
  expect(read(VPS.backup)).toContain("agent_rc -le 1");
});

it("checks each restored database by what the host can read", () => {
  const text = read(VPS.restoreTest);
  // pg_dumpall writes "--" first and its title on line 2.
  expect(text).toContain("PostgreSQL database cluster dump");
  // The host has no PostgreSQL client: custom dumps are known by their header.
  expect(text).not.toContain("pg_restore");
  expect(text.match(/grep -q PGDMP/g)).toHaveLength(2);
});

it("names the pictures mirror storage in the manifest", () => {
  const text = read(VPS.backup);
  expect(text).toContain('"storage": {');
  expect(text).toContain('record_component "storage-data"');
  expect(text).not.toContain('"minio": {');
  expect(text).not.toContain('"minio-data"');
});
