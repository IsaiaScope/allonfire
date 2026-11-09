#!/usr/bin/env bash
#
# workflows.sh — Version the n8n workflows that send the VPS's messages
#
# Usage: workflows.sh [--local] export [name…]   pull workflows from n8n into ./workflows/ (all, or the names given)
#        workflows.sh [--local] import <file>     load one back into n8n
#
# Runs on the Mac over `ssh main-vps`; with --local, against the Local n8n
# (the `allonfire-workflow` container) with no ssh. The committed JSON holds
# placeholders where real values were (Telegram chat ID, webhook path,
# keep-alive URL, webhook and credential IDs); `import` fills them in next to
# n8n itself: on the server from /opt/backups/.env, Locally from the
# git-ignored vps/.env (the same keys, Local's values), so a real value never
# reaches the repo.

set -euo pipefail

HOST="main-vps"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/vps/workflows"
NAMES=(backup-notification error-alert notifications services-keep-alive topic-discovery)

MODE=remote
if [[ "${1:-}" == "--local" ]]; then
  MODE=local
  shift
fi

# The env file the values come from, on the target: the same keys in both.
if [[ "$MODE" == local ]]; then ENV_PATH="$ROOT/vps/.env"; else ENV_PATH=/opt/backups/.env; fi

# Runs a script from stdin where n8n lives: the server over ssh, or here.
on_target() {
  if [[ "$MODE" == local ]]; then bash -s -- "$@"; else ssh "$HOST" bash -s -- "$@"; fi
}

# Puts a file on the target.
put() {
  if [[ "$MODE" == local ]]; then cp "$1" "$2"; else scp -q "$1" "$HOST:$2"; fi
}

workflow_id() {
  case "$1" in
    backup-notification) echo "NRLX4aFGv2uNotfc" ;;
    error-alert) echo "KX1CQrEVzEvV747w" ;;
    notifications) echo "100" ;;
    # Its ID is ours: the first import creates the workflow under it.
    services-keep-alive) echo "AofKeepAlive2611" ;;
    topic-discovery) echo "101" ;;
    *) echo "workflows.sh: unknown workflow '$1'" >&2; return 1 ;;
  esac
}

# Placeholders in, volatile fields out. Node IDs stay: they are random per
# workflow and the connections need them. Tags go: their IDs are n8n's own.
REDACT='(if type == "array" then .[0] else . end)
  | del(.updatedAt, .createdAt, .versionId, .activeVersionId, .shared, .meta,
        .pinData, .staticData, .triggerCount, .isArchived, .tags, .versionCounter,
        .nodeGroups, .sourceWorkflowId, .versionMetadata)
  | .nodes |= map(
      (if .parameters.chatId? then .parameters.chatId = "<telegram-chat-id>" else . end)
      | (if .type == "n8n-nodes-base.webhook" then .parameters.path = "<backup-webhook-path>" else . end)
      | (if .type == "n8n-nodes-base.httpRequest" and (.parameters.url | tostring | test("services/keep-alive")) then .parameters.url = "<keep-alive-url>" else . end)
      | (if .webhookId? then .webhookId = "<webhook-id>" else . end)
      | (if .credentials? then .credentials |= map_values(.id = "<credential-id>") else . end))'

# Prints one workflow as n8n exports it.
remote_export() {
  on_target "$1" "$ENV_PATH" <<'REMOTE'
set -euo pipefail
PATTERN="$({ grep '^BACKUP_WORKFLOW_CONTAINER_PATTERN=' "$2" || true; } | cut -d= -f2- | tr -d '"')"
C="$(docker ps --format '{{.Names}}' | grep -m1 "${PATTERN:-n8n}")"
docker exec "$C" n8n export:workflow --id="$1" --output="/tmp/wf-$1.json" >/dev/null 2>&1
docker exec "$C" cat "/tmp/wf-$1.json"
docker exec "$C" rm -f "/tmp/wf-$1.json"
REMOTE
}

export_all() {
  mkdir -p "$DIR"
  # The Services keep-alive exists on the VPS only after its first import: a
  # workflow n8n does not have is skipped, never written as an empty file.
  local tmp
  tmp="$(mktemp)"
  for name in "${@:-${NAMES[@]}}"; do
    if remote_export "$(workflow_id "$name")" | jq --indent 2 "$REDACT" > "$tmp" && [[ -s "$tmp" ]]; then
      # Local never activates a schedule, so its export says inactive: the
      # committed flag stays, or the next import would switch it off in Production.
      if [[ "$MODE" == local && -f "$DIR/$name.json" ]]; then
        jq --indent 2 --slurpfile old "$DIR/$name.json" '.active = $old[0].active' "$tmp" > "$tmp.active" && mv "$tmp.active" "$tmp"
      fi
      mv "$tmp" "$DIR/$name.json"
      echo "exported $name"
    else
      echo "skipped $name: n8n does not have it"
    fi
  done
  rm -f "$tmp"
}

import_one() {
  local file="$1" name id
  name="$(basename "$file" .json)"
  id="$(workflow_id "$name")"
  put "$file" "/tmp/wf-placeholders-$id.json"
  on_target "$id" "$MODE" "$ROOT" "$ENV_PATH" <<'REMOTE'
set -euo pipefail
umask 077
ID="$1"
MODE="$2"
ROOT="$3"
ENV="$4"
IN="/tmp/wf-placeholders-$ID.json"
OUT="/tmp/wf-filled-$ID.json"
trap 'rm -f "$IN" "$OUT" /tmp/wf-live.json /tmp/wf-creds.json /tmp/wf-newcreds.json' EXIT
value() { { grep "^$1=" "${2:-$ENV}" || true; } | cut -d= -f2- | tr -d '"'; }
PATTERN="$(value BACKUP_WORKFLOW_CONTAINER_PATTERN)"
C="$(docker ps --format '{{.Names}}' | grep -m1 "${PATTERN:-n8n}")"
CHAT="$(value BACKUP_TELEGRAM_CHAT_ID)"
URL="$(value BACKUP_WEBHOOK_URL)"
WEBHOOK_PATH=""
[[ "$URL" == */webhook/* ]] && WEBHOOK_PATH="${URL##*/webhook/}"
KEEP_ALIVE_URL="$(value BACKUP_KEEP_ALIVE_URL)"

# A placeholder the file holds and the env leaves empty would be imported as
# an empty value and fail at its first run (03:00 for the keep-alive): refuse.
need() {
  if jq -e --arg p "$1" '[.nodes[] | .. | strings] | any(. == $p)' "$IN" >/dev/null && [[ -z "$2" ]]; then
    echo "workflows.sh: $3 is empty in $ENV" >&2
    exit 1
  fi
}
need "<telegram-chat-id>" "$CHAT" BACKUP_TELEGRAM_CHAT_ID
need "<backup-webhook-path>" "$WEBHOOK_PATH" BACKUP_WEBHOOK_URL
need "<keep-alive-url>" "$KEEP_ALIVE_URL" BACKUP_KEEP_ALIVE_URL

credential_ids() {
  # Credential IDs by name; only id and name leave the export.
  docker exec "$C" n8n export:credentials --all --output=/tmp/wf-creds.json >/dev/null 2>&1
  docker exec "$C" cat /tmp/wf-creds.json | jq 'map({(.name): .id}) | add // {}' > /tmp/wf-creds.json
  docker exec "$C" rm -f /tmp/wf-creds.json
}
credential_ids

# Local only: every credential the workflow names is written from vps/.env (the
# keep-alive token from the API's own apps/api/.env, one source; a
# rotated token lands on the next import), under the ID it already has; one
# with no value there is created empty and its secret typed in n8n.
if [[ "$MODE" == local ]]; then
  SECRETS="$(jq -n \
    --arg alerts "$(value BACKUP_TELEGRAM_BOT_TOKEN)" \
    --arg allonfire "$(value BACKUP_TELEGRAM_ALLONFIRE_BOT_TOKEN)" \
    --arg webhook "$(value BACKUP_WEBHOOK_TOKEN)" \
    --arg keepAlive "$(value API_KEEP_ALIVE_TOKEN "$ROOT/apps/api/.env")" \
    '{"Bot - Main VPS Alerts": $alerts, "allonfire_bot": $allonfire, "X-Backup-Token": $webhook,
      "Keep-alive Token": (if $keepAlive == "" then "" else "Bearer " + $keepAlive end)}')"
  jq --slurpfile have /tmp/wf-creds.json --argjson secrets "$SECRETS" \
     '[.nodes[].credentials // {} | to_entries[] | {type: .key, name: .value.name}] | unique
      | map(. + {id: ($have[0][.name] // ("loc" + (.name | gsub("[^A-Za-z0-9]"; "") | .[0:30]))),
                 data: (($secrets[.name] // "") as $secret
                        | if .type == "telegramApi" then {accessToken: $secret, baseUrl: "https://api.telegram.org"}
                          elif .type == "httpHeaderAuth" then {name: (if (.name | startswith("X-")) then .name else "Authorization" end), value: $secret}
                          else {} end)})' "$IN" > /tmp/wf-newcreds.json
  if [[ "$(jq 'length' /tmp/wf-newcreds.json)" -gt 0 ]]; then
    docker cp /tmp/wf-newcreds.json "$C:/tmp/wf-newcreds.json"
    docker exec -u root "$C" chmod 644 /tmp/wf-newcreds.json
    docker exec "$C" n8n import:credentials --input=/tmp/wf-newcreds.json >/dev/null 2>&1 \
      || { echo "n8n refused the credentials" >&2; exit 1; }
    docker exec -u root "$C" rm -f /tmp/wf-newcreds.json
    jq -r '.[] | "credential " + .name + ": " + (if (.data.accessToken // .data.value) == "" then "empty, type its secret in n8n" else "filled from vps/.env" end)' /tmp/wf-newcreds.json
    credential_ids
  fi
fi

# The webhook ID of the live workflow, so its URL does not move; a new one otherwise.
WEBHOOK_ID=""
if docker exec "$C" n8n export:workflow --id="$ID" --output=/tmp/wf-live.json >/dev/null 2>&1; then
  WEBHOOK_ID="$(docker exec "$C" cat /tmp/wf-live.json \
    | jq -r '(if type == "array" then .[0] else . end) | [.nodes[] | .webhookId // empty][0] // ""')"
  docker exec "$C" rm -f /tmp/wf-live.json
fi
[[ -n "$WEBHOOK_ID" ]] || WEBHOOK_ID="$(docker exec "$C" cat /proc/sys/kernel/random/uuid)"

jq --arg chat "$CHAT" \
   --arg path "$WEBHOOK_PATH" \
   --arg webhook "$WEBHOOK_ID" \
   --arg keepAlive "$KEEP_ALIVE_URL" \
   --slurpfile creds /tmp/wf-creds.json \
   '.nodes |= map(
      (if .parameters.chatId? == "<telegram-chat-id>" then .parameters.chatId = $chat else . end)
      | (if .parameters.path? == "<backup-webhook-path>" then .parameters.path = $path else . end)
      | (if .parameters.url? == "<keep-alive-url>" then .parameters.url = $keepAlive else . end)
      | (if .webhookId? == "<webhook-id>" then .webhookId = $webhook else . end)
      | (if .credentials? then .credentials |= map_values(.id = $creds[0][.name]) else . end))' \
   "$IN" > "$OUT"

# docker cp keeps the umask's 0600 and root: n8n runs as node and must read it.
docker cp "$OUT" "$C:$OUT"
docker exec -u root "$C" chmod 644 "$OUT"
docker exec "$C" n8n import:workflow --input="$OUT" >/dev/null 2>&1 \
  || { echo "n8n refused the import of $ID" >&2; exit 1; }
docker exec -u root "$C" rm -f "$OUT"

# Import leaves a workflow inactive; publish it again when the file says active.
# The CLI only writes the database: a running n8n registers an active workflow's
# webhooks when it starts, so without a restart they answer 404 (the backup
# notice was dead from 2026-11-02 to 2026-11-09). Restart through Swarm, never
# on the task container: Swarm would start a replacement beside the old task.
# Locally a schedule never goes active: it would send real mail and alerts at
# 03:00 whenever the Mac and the API happen to be up.
ACTIVE="$(jq -r '.active' "$IN")"
if [[ "$MODE" == local ]] && jq -e '[.nodes[].type] | any(. == "n8n-nodes-base.scheduleTrigger")' "$IN" >/dev/null; then
  ACTIVE=false
fi
if [[ "$ACTIVE" == "true" ]]; then
  docker exec "$C" n8n publish:workflow --id="$ID" >/dev/null 2>&1
  if [[ "$MODE" == local ]]; then
    docker compose -p allonfire -f "$ROOT/docker/docker-compose.dev.yml" restart workflow >/dev/null 2>&1
    for _ in $(seq 1 30); do curl -sf -o /dev/null http://127.0.0.1:5678/healthz && break; sleep 2; done
  else
    SERVICE="$(docker inspect -f '{{index .Config.Labels "com.docker.swarm.service.name"}}' "$C")"
    docker service update --force "$SERVICE" >/dev/null 2>&1
  fi
fi
rm -f "$IN"
echo "imported $ID ($MODE)"
REMOTE
}

case "${1:-}" in
  export) shift; export_all "$@" ;;
  import) [[ -n "${2:-}" ]] || { echo "Usage: workflows.sh [--local] import <file>" >&2; exit 1; }; import_one "$2" ;;
  *) echo "Usage: workflows.sh [--local] export [name…] | import <file>" >&2; exit 1 ;;
esac
