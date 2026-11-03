// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: regexes over the exported text, like the other repo-wide checks:
// this package does not depend on core, where the JSON helpers live.
/** The n8n workflows that send the VPS's messages, by their n8n ID. */
const WORKFLOWS = {
  "vps/workflows/backup-notification.json": "NRLX4aFGv2uNotfc",
  "vps/workflows/error-alert.json": "KX1CQrEVzEvV747w",
} as const satisfies Record<string, string>;
const BACKUP_NOTIFICATION = "vps/workflows/backup-notification.json";
const BACKUP_SCRIPT = "vps/backup.sh";
const ENV_EXAMPLE = "vps/.env.example";
const PLACEHOLDER = {
  chatId: "<telegram-chat-id>",
  credentialId: "<credential-id>",
  path: "<backup-webhook-path>",
  webhookId: "<webhook-id>",
} as const;
/** Fields n8n rewrites on every save: a diff of them says nothing. */
const VOLATILE = [
  "updatedAt",
  "createdAt",
  "versionId",
  "activeVersionId",
  "shared",
  "meta",
  "pinData",
  "staticData",
  "versionCounter",
] as const;
const CHAT_ID = /"chatId":\s*"([^"]*)"/g;
const PATH = /"path":\s*"([^"]*)"/g;
const WEBHOOK_ID = /"webhookId":\s*"([^"]*)"/g;
const ANY_ID = /"id":\s*"([^"]*)"/g;
const NODE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONDITION_ID = /^condition-\d+$/;
/** `$json.body.tier` or `$json.body?.tier`. */
const BODY_FIELD = /\$json\.body\??\.([a-z_]+)/g;
/** The manifest's one nested object: `$json.body.storage.age_days`. */
const STORAGE_FIELD = /\$json\.body\??\.storage\??\.([a-z_]+)/g;
const CHAT_ID_KEY = /^BACKUP_TELEGRAM_CHAT_ID=/m;

const values = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map(([, value]) => value);

it.each(Object.entries(WORKFLOWS))(
  "keeps only placeholders in %s",
  (file, workflowId) => {
    const text = read(file);
    expect(values(text, CHAT_ID).length).toBeGreaterThan(0);
    for (const chatId of values(text, CHAT_ID)) {
      expect(chatId).toBe(PLACEHOLDER.chatId);
    }
    for (const path of values(text, PATH)) {
      expect(path).toBe(PLACEHOLDER.path);
    }
    for (const webhookId of values(text, WEBHOOK_ID)) {
      expect(webhookId).toBe(PLACEHOLDER.webhookId);
    }
    // Node and condition IDs are random per workflow; the workflow's own ID is
    // how import finds it.
    for (const id of values(text, ANY_ID)) {
      const known =
        id === PLACEHOLDER.credentialId ||
        id === workflowId ||
        NODE_ID.test(id) ||
        CONDITION_ID.test(id);
      expect(known, id).toBe(true);
    }
  }
);

it.each(Object.keys(WORKFLOWS))("drops the volatile fields from %s", (file) => {
  const text = read(file);
  for (const field of VOLATILE) {
    expect(text).not.toContain(`"${field}":`);
  }
});

it("reads only manifest fields backup.sh writes", () => {
  const workflow = read(BACKUP_NOTIFICATION);
  const fields = [
    ...values(workflow, BODY_FIELD),
    ...values(workflow, STORAGE_FIELD),
  ];
  expect(fields.length).toBeGreaterThan(0);
  const script = read(BACKUP_SCRIPT);
  for (const field of new Set(fields)) {
    expect(script).toContain(`"${field}"`);
  }
});

const MINIO_NAME = /minio/i;

it("calls the pictures mirror storage in the backup message", () => {
  expect(read(BACKUP_NOTIFICATION)).not.toMatch(MINIO_NAME);
});

it("names the Telegram chat ID in the backups .env template", () => {
  expect(read(ENV_EXAMPLE)).toMatch(CHAT_ID_KEY);
});
