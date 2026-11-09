// @module-tag unit

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

// ponytail: regexes over the exported text, like the other repo-wide checks:
// this package does not depend on core, where the JSON helpers live.
const ERROR_WORKFLOW_ID = "KX1CQrEVzEvV747w";
/** The n8n workflows that send the VPS's messages, as [file, n8n ID]. */
const WORKFLOWS = [
  ["vps/workflows/backup-notification.json", "NRLX4aFGv2uNotfc"],
  ["vps/workflows/error-alert.json", ERROR_WORKFLOW_ID],
  ["vps/workflows/notifications.json", "100"],
  ["vps/workflows/services-keep-alive.json", "AofKeepAlive2611"],
  ["vps/workflows/topic-discovery.json", "101"],
] as const;
const WORKFLOW_FILES = WORKFLOWS.map(([file]) => file);
const BACKUP_NOTIFICATION = "vps/workflows/backup-notification.json";
const KEEP_ALIVE = "vps/workflows/services-keep-alive.json";
const WORKFLOWS_SCRIPT = "vps/workflows.sh";
const BACKUP_SCRIPT = "vps/backup.sh";
const ENV_EXAMPLE = "vps/.env.example";
const PLACEHOLDER = {
  chatId: "<telegram-chat-id>",
  credentialId: "<credential-id>",
  path: "<backup-webhook-path>",
  url: "<keep-alive-url>",
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
  "nodeGroups",
  "sourceWorkflowId",
  "versionMetadata",
] as const;
const CHAT_ID = /"chatId":\s*"([^"]*)"/g;
const PATH = /"path":\s*"([^"]*)"/g;
const WEBHOOK_ID = /"webhookId":\s*"([^"]*)"/g;
const URL_FIELD = /"url":\s*"([^"]*)"/g;
const ANY_ID = /"id":\s*"([^"]*)"/g;
const NODE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONDITION_ID = /^condition-\d+$/;
/** A node a person named by hand (`error-trigger`, `dedup`), not a random ID. */
const SLUG_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** `$json.body.tier` or `$json.body?.tier`. */
const BODY_FIELD = /\$json\.body\??\.([a-z_]+)/g;
/** The manifest's one nested object: `$json.body.storage.age_days`. */
const STORAGE_FIELD = /\$json\.body\??\.storage\??\.([a-z_]+)/g;
const KEEP_ALIVE_URL = /services\/keep-alive/;
const ENV_IGNORE = /^\.env$/m;
const CHAT_ID_KEY = /^BACKUP_TELEGRAM_CHAT_ID=/m;

const values = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map(([, value = ""]) => value);

it.each(WORKFLOWS)("keeps only placeholders in %s", (file, workflowId) => {
  const text = read(file);
  expect(values(text, CHAT_ID).length).toBeGreaterThan(0);
  for (const chatId of values(text, CHAT_ID)) {
    expect(chatId).toBe(PLACEHOLDER.chatId);
  }
  for (const path of values(text, PATH)) {
    expect(path).toBe(PLACEHOLDER.path);
  }
  // The keep-alive's own URL is the one a real host hides; the feeds the
  // other workflows read are public.
  for (const url of values(text, URL_FIELD)) {
    if (KEEP_ALIVE_URL.test(url) || file === KEEP_ALIVE) {
      expect(url).toBe(PLACEHOLDER.url);
    }
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
      CONDITION_ID.test(id) ||
      SLUG_ID.test(id);
    expect(known, id).toBe(true);
  }
});

it.each(WORKFLOW_FILES)("drops the volatile fields from %s", (file) => {
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

it("calls the keep-alive daily at 03:00 Rome time, reporting through the error workflow", () => {
  const workflow = read(KEEP_ALIVE);
  expect(workflow).toContain('"expression": "0 3 * * *"');
  expect(workflow).toContain('"timezone": "Europe/Rome"');
  expect(workflow).toContain(`"errorWorkflow": "${ERROR_WORKFLOW_ID}"`);
  expect(workflow).toContain("p.result === 'rejected'");
});

it.each(WORKFLOWS)(
  "lists %s in workflows.sh under its ID",
  (file, workflowId) => {
    const script = read(WORKFLOWS_SCRIPT);
    const name = file.replace("vps/workflows/", "").replace(".json", "");
    expect(script).toContain(`${name}) echo "${workflowId}"`);
    expect(script).toMatch(new RegExp(`NAMES=\\([^)]*\\b${name}\\b`));
  }
);

const TELEGRAM_MESSAGES = [
  BACKUP_NOTIFICATION,
  KEEP_ALIVE,
  "vps/workflows/error-alert.json",
] as const;

it.each(TELEGRAM_MESSAGES)("sends %s as HTML with no attribution", (file) => {
  const workflow = read(file);
  expect(workflow).toContain('"parse_mode": "HTML"');
  expect(workflow).toContain('"appendAttribution": false');
});

it("writes the keep-alive message in the VPS alerts' format", () => {
  const message = read(KEEP_ALIVE);
  // Bold title, then the bare time: the failing list already says what is wrong.
  expect(message).toContain("🚨 <b>Keep-alive failed</b>");
  expect(message).toContain(
    "📅 <code>{{ $now.toFormat('dd/MM HH:mm') }}</code>\\n"
  );
  expect(message).not.toContain("🛠");
  // The count line and the failing list in a quote: `name → status`.
  expect(message).toContain("📊");
  expect(message).toContain("❌ <b>Failing</b>");
  expect(message).toContain("<blockquote>");
  expect(message).toContain("→ ' + p.result");
  // A provider's name is typed by an Admin: escaped, `&` first.
  expect(message).toContain("replace(/&/g,'&amp;')");
});

it("restarts n8n after importing an active workflow, through Swarm", () => {
  const script = read(WORKFLOWS_SCRIPT);
  // The CLI only writes the database: a running n8n registers an active
  // workflow's webhooks when it starts, so an import alone leaves them dead.
  expect(script).toContain("docker service update --force");
  expect(script).not.toContain("docker restart");
});

it("runs workflows.sh against the Local n8n with --local, both ways", () => {
  const script = read(WORKFLOWS_SCRIPT);
  expect(script).toContain("--local");
  // Local's values come from the git-ignored vps/.env, under the same keys as
  // Production's /opt/backups/.env: nothing about Local is written in the script.
  expect(script).toContain('"$ROOT/vps/.env"');
  expect(script).not.toContain("vps/.env.production");
  expect(script).not.toContain("host.docker.internal");
  expect(script).not.toContain("backup-local");
  expect(script).not.toContain("C=allonfire-workflow");
});

it.each([
  "BACKUP_KEEP_ALIVE_URL",
  "BACKUP_TELEGRAM_ALLONFIRE_BOT_TOKEN",
  "BACKUP_TELEGRAM_BOT_TOKEN",
  "BACKUP_TELEGRAM_CHAT_ID",
  "BACKUP_WEBHOOK_TOKEN",
  "BACKUP_WEBHOOK_URL",
  "BACKUP_WORKFLOW_CONTAINER_PATTERN",
])("reads %s from the env file, and the guide names it", (key) => {
  expect(read(WORKFLOWS_SCRIPT)).toContain(key);
  expect(read("docs/guides/vps-workflow.md")).toContain(key);
});

it("takes the Local keep-alive token from the API's own .env, not a copy", () => {
  const script = read(WORKFLOWS_SCRIPT);
  expect(script).toContain("apps/api/.env");
  expect(script).toContain("API_KEEP_ALIVE_TOKEN");
  expect(script).not.toContain("BACKUP_KEEP_ALIVE_TOKEN");
});

it("refuses an import whose placeholder has no value to fill", () => {
  // An empty keep-alive URL imported silently fails at 03:00, not at import.
  const script = read(WORKFLOWS_SCRIPT);
  for (const key of [
    "BACKUP_KEEP_ALIVE_URL",
    "BACKUP_TELEGRAM_CHAT_ID",
    "BACKUP_WEBHOOK_URL",
  ]) {
    expect(script).toMatch(new RegExp(`need "<[a-z-]+>" "[^"]+" ${key}`));
  }
  expect(script).toContain("is empty in");
});

it("lists the Local-only bot tokens in the env template", () => {
  const example = read(ENV_EXAMPLE);
  expect(example).toContain("BACKUP_TELEGRAM_ALLONFIRE_BOT_TOKEN");
  expect(example).toContain("BACKUP_TELEGRAM_BOT_TOKEN");
});

it.each(WORKFLOW_FILES)("describes %s in the workflow guide", (file) => {
  expect(read("docs/guides/vps-workflow.md")).toContain(file);
});

it("keeps the Local vps/.env out of git", () => {
  expect(read(".gitignore")).toMatch(ENV_IGNORE);
});

it("restarts the Local n8n through compose, never on the task container", () => {
  const script = read(WORKFLOWS_SCRIPT);
  expect(script).toContain("docker compose");
  expect(script).not.toContain("docker restart");
});

it("documents the Local workflow loop in the workflow guide", () => {
  const guide = read("docs/guides/vps-workflow.md");
  expect(guide).toContain("workflows.sh --local import");
  expect(guide).toContain("workflows.sh --local export");
});

it("keeps a workflow's committed active flag when exporting from Local", () => {
  // Local never activates a schedule, so its export says false: taking it
  // would switch the workflow off in Production on the next import.
  expect(read(WORKFLOWS_SCRIPT)).toContain("$old[0].active");
});
