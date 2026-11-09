#!/usr/bin/env bash
#
# hetzner-snapshot.sh — Create a Hetzner Cloud server snapshot, prune old ones (keep 4)
#
# Usage: hetzner-snapshot.sh
# Requires: BACKUP_HCLOUD_TOKEN and BACKUP_HETZNER_SERVER_ID in /opt/backups/.env
#
# Exit codes: 0=success, 1=failure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo '{"error":"Missing .env file"}' >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${BACKUP_HCLOUD_TOKEN:?Missing BACKUP_HCLOUD_TOKEN}"
: "${BACKUP_HETZNER_SERVER_ID:?Missing BACKUP_HETZNER_SERVER_ID}"
# The hcloud CLI reads its token from its own variable.
export HCLOUD_TOKEN="$BACKUP_HCLOUD_TOKEN"

BACKUP_KEEP_SNAPSHOTS="${BACKUP_KEEP_SNAPSHOTS:-4}"
DATE="$(date -u +%Y-%m-%d)"
SNAPSHOT_DESC="auto-backup-${DATE}"

log() { echo "[$(date -u +%H:%M:%S)] $*" >&2; }

# ── Create snapshot ─────────────────────────────────────────────────────────

log "Creating snapshot '${SNAPSHOT_DESC}' for server ${BACKUP_HETZNER_SERVER_ID}..."

# create-image doesn't support --output json; parse image ID from text output
CREATE_OUTPUT=$(hcloud server create-image \
  --type snapshot \
  --description "$SNAPSHOT_DESC" \
  "$BACKUP_HETZNER_SERVER_ID" 2>&1) || {
  echo "{\"status\":\"failed\",\"error\":\"hcloud create-image failed: ${CREATE_OUTPUT}\"}"
  exit 1
}

# Extract image ID from "Image <image-id> created from Server <hetzner-server-id>"
IMAGE_ID=$(echo "$CREATE_OUTPUT" | grep -oP 'Image \K[0-9]+' | head -1)

if [[ -z "$IMAGE_ID" ]]; then
  log "ERROR: Failed to parse snapshot image ID"
  echo "{\"status\":\"failed\",\"error\":\"No image ID in output: ${CREATE_OUTPUT}\"}"
  exit 1
fi

log "Snapshot created: id=${IMAGE_ID}"

# ── Prune old snapshots ────────────────────────────────────────────────────

log "Pruning snapshots (keeping ${BACKUP_KEEP_SNAPSHOTS} most recent)..."

# This server's own snapshots: by our description prefix, and made from this
# server, so another server's auto-backups in the project are never pruned.
SNAPSHOTS=$(hcloud image list --type snapshot --output json 2>/dev/null | \
  jq --arg server "$BACKUP_HETZNER_SERVER_ID" \
    '[.[] | select(.description | startswith("auto-backup-")) | select(.created_from.id == ($server | tonumber))]' \
    2>/dev/null || echo "[]")

SNAPSHOT_COUNT=$(echo "$SNAPSHOTS" | jq 'length')

if [[ "$SNAPSHOT_COUNT" -gt "$BACKUP_KEEP_SNAPSHOTS" ]]; then
  DELETE_COUNT=$((SNAPSHOT_COUNT - BACKUP_KEEP_SNAPSHOTS))
  # Get IDs of oldest snapshots to delete
  DELETE_IDS=$(echo "$SNAPSHOTS" | jq -r "sort_by(.created) | .[0:${DELETE_COUNT}] | .[].id")

  for id in $DELETE_IDS; do
    log "Deleting old snapshot: ${id}"
    hcloud image delete "$id" 2>/dev/null || log "WARNING: Failed to delete snapshot ${id}"
  done
  log "Pruned ${DELETE_COUNT} old snapshot(s)"
else
  log "No pruning needed (${SNAPSHOT_COUNT}/${BACKUP_KEEP_SNAPSHOTS} snapshots)"
fi

# ── Output JSON ─────────────────────────────────────────────────────────────

echo "{\"status\":\"success\",\"image_id\":\"${IMAGE_ID}\",\"description\":\"${SNAPSHOT_DESC}\",\"snapshots_total\":${SNAPSHOT_COUNT}}"
