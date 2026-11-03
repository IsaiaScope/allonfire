#!/usr/bin/env bash
#
# workflows.sh — Version the n8n workflows that send the VPS's messages
#
# Usage: workflows.sh export            pull both workflows from n8n into ./workflows/
#        workflows.sh import <file>     load one back into n8n
#
# Runs on the Mac over `ssh main-vps`. The committed JSON holds placeholders
# where real values were (Telegram chat ID, webhook path, webhook and
# credential IDs); `import` fills them in on the server from /opt/backups/.env
# and n8n itself, so a real value never reaches the Mac or the repo.

set -euo pipefail

HOST="main-vps"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/workflows"
NAMES=(backup-notification error-alert)

workflow_id() {
  case "$1" in
    backup-notification) echo "NRLX4aFGv2uNotfc" ;;
    error-alert) echo "KX1CQrEVzEvV747w" ;;
    *) echo "workflows.sh: unknown workflow '$1'" >&2; return 1 ;;
  esac
}

# Placeholders in, volatile fields out. Node IDs stay: they are random per
# workflow and the connections need them. Tags go: their IDs are n8n's own.
REDACT='(if type == "array" then .[0] else . end)
  | del(.updatedAt, .createdAt, .versionId, .activeVersionId, .shared, .meta,
        .pinData, .staticData, .triggerCount, .isArchived, .tags, .versionCounter)
  | .nodes |= map(
      (if .parameters.chatId? then .parameters.chatId = "<telegram-chat-id>" else . end)
      | (if .type == "n8n-nodes-base.webhook" then .parameters.path = "<backup-webhook-path>" else . end)
      | (if .webhookId? then .webhookId = "<webhook-id>" else . end)
      | (if .credentials? then .credentials |= map_values(.id = "<credential-id>") else . end))'

# Prints one workflow as n8n exports it.
remote_export() {
  ssh "$HOST" bash -s -- "$1" <<'REMOTE'
set -euo pipefail
PATTERN="$(grep '^BACKUP_WORKFLOW_CONTAINER_PATTERN=' /opt/backups/.env | cut -d= -f2- || true)"
C="$(docker ps --format '{{.Names}}' | grep -m1 "${PATTERN:-n8n}")"
docker exec "$C" n8n export:workflow --id="$1" --output="/tmp/wf-$1.json" >/dev/null 2>&1
docker exec "$C" cat "/tmp/wf-$1.json"
docker exec "$C" rm -f "/tmp/wf-$1.json"
REMOTE
}

export_all() {
  mkdir -p "$DIR"
  for name in "${NAMES[@]}"; do
    remote_export "$(workflow_id "$name")" | jq --indent 2 "$REDACT" > "$DIR/$name.json"
    echo "exported $name"
  done
}

import_one() {
  local file="$1" name id
  name="$(basename "$file" .json)"
  id="$(workflow_id "$name")"
  scp -q "$file" "$HOST:/tmp/wf-placeholders-$id.json"
  ssh "$HOST" bash -s -- "$id" <<'REMOTE'
set -euo pipefail
umask 077
ID="$1"
ENV=/opt/backups/.env
IN="/tmp/wf-placeholders-$ID.json"
OUT="/tmp/wf-filled-$ID.json"
trap 'rm -f "$IN" "$OUT" /tmp/wf-live.json /tmp/wf-creds.json' EXIT
value() { grep "^$1=" "$ENV" | cut -d= -f2-; }
PATTERN="$(value BACKUP_WORKFLOW_CONTAINER_PATTERN)"
C="$(docker ps --format '{{.Names}}' | grep -m1 "$PATTERN")"
URL="$(value BACKUP_WEBHOOK_URL)"

# Credential IDs by name; only id and name leave the export.
docker exec "$C" n8n export:credentials --all --output=/tmp/wf-creds.json >/dev/null 2>&1
docker exec "$C" cat /tmp/wf-creds.json | jq 'map({(.name): .id}) | add' > /tmp/wf-creds.json
docker exec "$C" rm -f /tmp/wf-creds.json

# The webhook ID of the live workflow, so its URL does not move; a new one otherwise.
WEBHOOK_ID=""
if docker exec "$C" n8n export:workflow --id="$ID" --output=/tmp/wf-live.json >/dev/null 2>&1; then
  WEBHOOK_ID="$(docker exec "$C" cat /tmp/wf-live.json \
    | jq -r '(if type == "array" then .[0] else . end) | [.nodes[] | .webhookId // empty][0] // ""')"
  docker exec "$C" rm -f /tmp/wf-live.json
fi
[[ -n "$WEBHOOK_ID" ]] || WEBHOOK_ID="$(cat /proc/sys/kernel/random/uuid)"

jq --arg chat "$(value BACKUP_TELEGRAM_CHAT_ID)" \
   --arg path "${URL##*/webhook/}" \
   --arg webhook "$WEBHOOK_ID" \
   --slurpfile creds /tmp/wf-creds.json \
   '.nodes |= map(
      (if .parameters.chatId? == "<telegram-chat-id>" then .parameters.chatId = $chat else . end)
      | (if .parameters.path? == "<backup-webhook-path>" then .parameters.path = $path else . end)
      | (if .webhookId? == "<webhook-id>" then .webhookId = $webhook else . end)
      | (if .credentials? then .credentials |= map_values(.id = $creds[0][.name]) else . end))' \
   "$IN" > "$OUT"

docker cp "$OUT" "$C:$OUT"
docker exec "$C" n8n import:workflow --input="$OUT" >/dev/null 2>&1
docker exec "$C" rm -f "$OUT"
# Import leaves a workflow inactive; publish it again when the file says active.
# The running n8n keeps serving the webhook (checked 2026-11-02), so no restart.
if [[ "$(jq -r '.active' "$IN")" == "true" ]]; then
  docker exec "$C" n8n publish:workflow --id="$ID" >/dev/null 2>&1
fi
echo "imported $ID"
REMOTE
}

case "${1:-}" in
  export) export_all ;;
  import) [[ -n "${2:-}" ]] || { echo "Usage: workflows.sh import <file>" >&2; exit 1; }; import_one "$2" ;;
  *) echo "Usage: workflows.sh export | import <file>" >&2; exit 1 ;;
esac
