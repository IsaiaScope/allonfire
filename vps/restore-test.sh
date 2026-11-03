#!/usr/bin/env bash
#
# restore-test.sh — Download latest backup from S3, decrypt, and verify integrity
#
# Usage: restore-test.sh [tier]   (default: daily)
# Requires: BACKUP_AGE_PRIVATE_KEY_PATH in /opt/backups/.env (or passed via env)
#
# Exit codes: 0=all OK, 1=some components failed, 2=total failure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo '{"error":"Missing .env file"}' >&2
  exit 2
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

: "${BACKUP_S3_BUCKET:?Missing BACKUP_S3_BUCKET}"
: "${BACKUP_AGE_PRIVATE_KEY_PATH:?Missing BACKUP_AGE_PRIVATE_KEY_PATH — path to age identity file}"

TIER="${1:-daily}"
RESTORE_DIR="/tmp/restore-test-$(date -u +%Y%m%d%H%M%S)"
RESULTS=()
FAILURES=0

log() { echo "[$(date -u +%H:%M:%S)] $*" >&2; }

cleanup() {
  log "Cleaning up ${RESTORE_DIR}..."
  rm -rf "$RESTORE_DIR"
}
trap cleanup EXIT

# ── Find latest backup ─────────────────────────────────────────────────────

log "Finding latest ${TIER} backup in s3://${BACKUP_S3_BUCKET}/${TIER}/..."

LATEST_PREFIX=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/${TIER}/" 2>/dev/null | \
  grep 'PRE' | awk '{print $2}' | sort -r | head -1)

if [[ -z "$LATEST_PREFIX" ]]; then
  log "ERROR: No ${TIER} backups found in S3"
  echo "{\"status\":\"failed\",\"error\":\"No backups found for tier: ${TIER}\"}"
  exit 2
fi

S3_PATH="s3://${BACKUP_S3_BUCKET}/${TIER}/${LATEST_PREFIX}"
log "Latest backup: ${S3_PATH}"

# ── Download ────────────────────────────────────────────────────────────────

mkdir -p "$RESTORE_DIR"
log "Downloading to ${RESTORE_DIR}..."

if ! aws s3 cp "$S3_PATH" "$RESTORE_DIR/" --recursive --quiet 2>/dev/null; then
  log "ERROR: S3 download failed"
  echo "{\"status\":\"failed\",\"error\":\"S3 download failed\"}"
  exit 2
fi

# ── Verify manifest ────────────────────────────────────────────────────────

MANIFEST="${RESTORE_DIR}/manifest.json"
if [[ -f "$MANIFEST" ]]; then
  MANIFEST_DATE=$(jq -r '.date' "$MANIFEST")
  MANIFEST_STATUS=$(jq -r '.status' "$MANIFEST")
  log "Manifest: date=${MANIFEST_DATE} status=${MANIFEST_STATUS}"
  RESULTS+=("{\"name\":\"manifest\",\"status\":\"ok\",\"date\":\"${MANIFEST_DATE}\"}")
else
  log "WARNING: No manifest.json found"
  RESULTS+=("{\"name\":\"manifest\",\"status\":\"missing\"}")
  ((FAILURES++)) || true
fi

# ── Decrypt and verify each component ──────────────────────────────────────

verify_component() {
  local name="$1" encrypted="$2" verify_cmd="$3"

  if [[ ! -f "$encrypted" ]]; then
    log "SKIP: ${name} — file not in backup"
    RESULTS+=("{\"name\":\"${name}\",\"status\":\"skipped\"}")
    return
  fi

  local decrypted="${encrypted%.age}"
  log "Decrypting ${name}..."

  if ! age -d -i "$BACKUP_AGE_PRIVATE_KEY_PATH" -o "$decrypted" "$encrypted" 2>/dev/null; then
    log "FAIL: ${name} — decryption failed"
    RESULTS+=("{\"name\":\"${name}\",\"status\":\"decrypt_failed\"}")
    ((FAILURES++)) || true
    return
  fi

  log "Verifying ${name}..."
  if eval "$verify_cmd" >/dev/null 2>&1; then
    local size
    size=$(stat -c%s "$decrypted" 2>/dev/null || stat -f%z "$decrypted" 2>/dev/null || echo 0)
    log "OK: ${name} ($(numfmt --to=iec "$size" 2>/dev/null || echo "${size} bytes"))"
    RESULTS+=("{\"name\":\"${name}\",\"status\":\"ok\",\"size\":${size}}")
  else
    log "FAIL: ${name} — verification failed"
    RESULTS+=("{\"name\":\"${name}\",\"status\":\"verify_failed\"}")
    ((FAILURES++)) || true
  fi
}

# PostgreSQL (all databases): verify the SQL dump is valid
verify_component "postgres-all" \
  "${RESTORE_DIR}/postgres-all.dump.age" \
  "head -5 '${RESTORE_DIR}/postgres-all.dump' | grep -q 'PostgreSQL database cluster dump'"

# n8n binary data: verify tar archive lists files
verify_component "n8n-data" \
  "${RESTORE_DIR}/n8n-data.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/n8n-data.tar.gz'"

# Dokploy config: custom-format dump, known by its PGDMP header.
verify_component "dokploy-config" \
  "${RESTORE_DIR}/dokploy-config.dump.age" \
  "head -c 5 '${RESTORE_DIR}/dokploy-config.dump' | grep -q PGDMP"

# Multica database: custom-format dump, known by its PGDMP header. Neither the
# server nor the operator machine is sure to have a PostgreSQL client;
# head+grep are everywhere (docs/guides/vps-backups.md).
verify_component "multica-postgres" \
  "${RESTORE_DIR}/multica-postgres.dump.age" \
  "head -c 5 '${RESTORE_DIR}/multica-postgres.dump' | grep -q PGDMP"

# Multica uploads: tar archive lists files
verify_component "multica-uploads" \
  "${RESTORE_DIR}/multica-uploads.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/multica-uploads.tar.gz'"

# Server config: verify tar archive lists files
verify_component "server-config" \
  "${RESTORE_DIR}/server-config.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/server-config.tar.gz'"

# SSL certs: verify tar archive lists files
verify_component "ssl-certs" \
  "${RESTORE_DIR}/ssl-certs.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/ssl-certs.tar.gz'"

# Traefik dynamic config: verify tar archive lists files
verify_component "traefik-dynamic-config" \
  "${RESTORE_DIR}/traefik-dynamic-config.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/traefik-dynamic-config.tar.gz'"

# Beszel monitoring data: verify tar archive lists files
verify_component "beszel-data" \
  "${RESTORE_DIR}/beszel-data.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/beszel-data.tar.gz'"

# Agent state: verify tar archive lists files
verify_component "agent-state" \
  "${RESTORE_DIR}/agent-state.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/agent-state.tar.gz'"

# Dokploy app configs: verify tar archive lists files
verify_component "dokploy-apps-config" \
  "${RESTORE_DIR}/dokploy-apps-config.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/dokploy-apps-config.tar.gz'"

# System metadata: verify tar archive lists files
verify_component "system-metadata" \
  "${RESTORE_DIR}/system-metadata.tar.gz.age" \
  "tar -tzf '${RESTORE_DIR}/system-metadata.tar.gz'"

# ── Storage mirror ───────────────────────────────────────────────────────────
#
# The mirror is unencrypted and undated, so it cannot be decrypt-tested like the
# eleven components above. Checking only that it exists would pass even if the
# sync had been broken for months, so freshness is the part that matters: the
# mirror runs weekly, and anything past 9 days means a Sunday was missed.

log "Checking storage mirror (unencrypted, undated — existence + freshness)..."
MINIO_LS="$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/minio-mirror/" --recursive --summarize 2>/dev/null || true)"
MINIO_OBJECTS="$(sed -n 's/.*Total Objects: *//p' <<<"$MINIO_LS" | tail -1)"
MINIO_OBJECTS="${MINIO_OBJECTS:-0}"

if [[ "$MINIO_OBJECTS" -eq 0 ]]; then
  log "FAIL: storage-mirror — no objects at s3://${BACKUP_S3_BUCKET}/minio-mirror/"
  RESULTS+=("{\"name\":\"storage-mirror\",\"status\":\"empty\"}")
  ((FAILURES++)) || true
else
  MINIO_BYTES="$(sed -n 's/.*Total Size: *//p' <<<"$MINIO_LS" | tail -1)"
  MINIO_BYTES="${MINIO_BYTES:-0}"
  # Character classes, not {4} intervals — awk implementations disagree on those.
  MINIO_NEWEST="$(awk '$1 ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/ {print $1}' <<<"$MINIO_LS" | sort | tail -1)"
  # python3 rather than `date`: this drill runs from the Mac (BSD date) but may
  # also be run on the VPS (GNU date), and the two disagree on parsing flags.
  MINIO_AGE="$(python3 -c 'import datetime,sys; print((datetime.date.today()-datetime.date.fromisoformat(sys.argv[1])).days)' "$MINIO_NEWEST" 2>/dev/null || echo -1)"

  if [[ "$MINIO_AGE" -lt 0 ]]; then
    log "WARN: storage-mirror — ${MINIO_OBJECTS} objects, age unknown (could not parse '${MINIO_NEWEST}')"
    RESULTS+=("{\"name\":\"storage-mirror\",\"status\":\"ok\",\"objects\":${MINIO_OBJECTS},\"size\":${MINIO_BYTES},\"age_days\":-1}")
  elif [[ "$MINIO_AGE" -gt 9 ]]; then
    log "FAIL: storage-mirror — stale, newest object is ${MINIO_AGE} days old (${MINIO_NEWEST})"
    RESULTS+=("{\"name\":\"storage-mirror\",\"status\":\"stale\",\"objects\":${MINIO_OBJECTS},\"size\":${MINIO_BYTES},\"age_days\":${MINIO_AGE}}")
    ((FAILURES++)) || true
  else
    log "OK: storage-mirror (${MINIO_OBJECTS} objects, $(numfmt --to=iec "${MINIO_BYTES}" 2>/dev/null || echo "${MINIO_BYTES} bytes"), ${MINIO_AGE}d old)"
    RESULTS+=("{\"name\":\"storage-mirror\",\"status\":\"ok\",\"objects\":${MINIO_OBJECTS},\"size\":${MINIO_BYTES},\"age_days\":${MINIO_AGE}}")
  fi
fi

# ── Output JSON ─────────────────────────────────────────────────────────────

TOTAL=${#RESULTS[@]}
if [[ $FAILURES -eq 0 ]]; then
  STATUS="success"
  EXIT_CODE=0
elif [[ $FAILURES -lt $TOTAL ]]; then
  STATUS="partial_failure"
  EXIT_CODE=1
else
  STATUS="total_failure"
  EXIT_CODE=2
fi

# Build results JSON
results_json="["
for i in "${!RESULTS[@]}"; do
  [[ $i -gt 0 ]] && results_json+=","
  results_json+="${RESULTS[$i]}"
done
results_json+="]"

cat <<JSON_EOF
{
  "status": "${STATUS}",
  "tier": "${TIER}",
  "s3_path": "${S3_PATH}",
  "components_tested": ${TOTAL},
  "failures": ${FAILURES},
  "results": ${results_json}
}
JSON_EOF

exit "$EXIT_CODE"
