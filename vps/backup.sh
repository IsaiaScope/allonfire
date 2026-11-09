#!/usr/bin/env bash
#
# backup.sh — Dump, encrypt, and upload all service data to S3 Glacier IR
#
# Usage: backup.sh [--dry-run] [--test-notify] [daily|weekly|monthly]
#   --dry-run      Run full backup pipeline but skip S3 upload and webhook
#   --test-notify  Send a synthetic test manifest to n8n webhook, then exit
#   Tier is auto-detected if omitted (Sunday=weekly, 1st of month=monthly, else daily).
#
# Exit codes: 0=success, 1=partial failure, 2=total failure
# Outputs JSON manifest to stdout for n8n to parse.

set -euo pipefail

# ── Flag parsing ──────────────────────────────────────────────────────────
DRY_RUN="false"
TEST_NOTIFY="false"
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)    DRY_RUN="true"; shift ;;
    --test-notify) TEST_NOTIFY="true"; shift ;;
    *)            POSITIONAL+=("$1"); shift ;;
  esac
done
set -- "${POSITIONAL[@]+"${POSITIONAL[@]}"}"

# ── Config ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo '{"error":"Missing .env file at '"$ENV_FILE"'"}' >&2
  exit 2
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# Required variables (validated below)
: "${BACKUP_S3_BUCKET:?Missing BACKUP_S3_BUCKET}"
: "${BACKUP_AGE_PUBLIC_KEY:?Missing BACKUP_AGE_PUBLIC_KEY}"
: "${BACKUP_PG_CONTAINER_PATTERN:?Missing BACKUP_PG_CONTAINER_PATTERN}"
: "${BACKUP_WORKFLOW_CONTAINER_PATTERN:?Missing BACKUP_WORKFLOW_CONTAINER_PATTERN}"
: "${BACKUP_DOKPLOY_PG_CONTAINER_PATTERN:?Missing BACKUP_DOKPLOY_PG_CONTAINER_PATTERN}"
: "${BACKUP_STORAGE_CONTAINER_PATTERN:?Missing BACKUP_STORAGE_CONTAINER_PATTERN}"
: "${BACKUP_AGENT_VOLUME:?Missing BACKUP_AGENT_VOLUME}"
: "${BACKUP_AGENT_DIR:?Missing BACKUP_AGENT_DIR}"

BACKUP_LOCAL_RETENTION_DAYS="${BACKUP_LOCAL_RETENTION_DAYS:-2}"

# ── --test-notify: send synthetic manifest and exit ───────────────────────

if [[ "$TEST_NOTIFY" == "true" ]]; then
  BACKUP_WEBHOOK_URL="${BACKUP_WEBHOOK_URL:-}"
  if [[ -z "$BACKUP_WEBHOOK_URL" ]]; then
    echo '{"error":"BACKUP_WEBHOOK_URL not set — cannot test notification"}' >&2
    exit 2
  fi
  TEST_MANIFEST=$(cat <<'TMEOF'
{
  "date": "TEST",
  "timestamp": "TEST",
  "tier": "test",
  "status": "test",
  "total_size_bytes": 0,
  "storage": {
    "status": "test",
    "last_sync": "2026-08-02",
    "age_days": 3,
    "files_uploaded": 7,
    "mirror_bytes": 76891234
  },
  "components": [
    {"name":"postgres-all","file":"test","size":0,"status":"test"},
    {"name":"n8n-data","file":"test","size":0,"status":"test"},
    {"name":"dokploy-config","file":"test","size":0,"status":"test"},
    {"name":"multica-postgres","file":"test","size":0,"status":"test"},
    {"name":"multica-uploads","file":"test","size":0,"status":"test"},
    {"name":"server-config","file":"test","size":0,"status":"test"},
    {"name":"ssl-certs","file":"test","size":0,"status":"test"},
    {"name":"traefik-dynamic-config","file":"test","size":0,"status":"test"},
    {"name":"beszel-data","file":"test","size":0,"status":"test"},
    {"name":"agent-state","file":"test","size":0,"status":"test"},
    {"name":"dokploy-apps-config","file":"test","size":0,"status":"test"},
    {"name":"system-metadata","file":"test","size":0,"status":"test"},
    {"name":"storage-data","file":"test","size":0,"status":"test"}
  ],
  "errors": [],
  "s3_prefix": "s3://test/test"
}
TMEOF
  )
  echo "[test-notify] Sending test manifest to ${BACKUP_WEBHOOK_URL}..." >&2
  HTTP_CODE=$(curl -s -o /dev/stderr -w "%{http_code}" -X POST "$BACKUP_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "X-Backup-Token: ${BACKUP_WEBHOOK_TOKEN:-}" \
    -d "$TEST_MANIFEST" --max-time 10 2>&1) || true
  echo "[test-notify] Webhook responded: HTTP ${HTTP_CODE}" >&2
  echo "$TEST_MANIFEST"
  exit 0
fi

STAGING_BASE="/opt/backups/staging"
DATE="$(date -u +%Y-%m-%d)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ── Tier detection ──────────────────────────────────────────────────────────

if [[ -n "${1:-}" ]]; then
  TIER="$1"
else
  DAY_OF_MONTH="$(date -u +%d)"
  DAY_OF_WEEK="$(date -u +%u)"  # 7=Sunday
  if [[ "$DAY_OF_MONTH" == "01" ]]; then
    TIER="monthly"
  elif [[ "$DAY_OF_WEEK" == "7" ]]; then
    TIER="weekly"
  else
    TIER="daily"
  fi
fi

STAGING_DIR="${STAGING_BASE}/${DATE}"
S3_PREFIX="s3://${BACKUP_S3_BUCKET}/${TIER}/${DATE}"

# ── Helpers ─────────────────────────────────────────────────────────────────

errors=()
components=()
total_size=0

log() { echo "[$(date -u +%H:%M:%S)] $*" >&2; }

find_container() {
  docker ps --format '{{.Names}}' | grep -m1 "$1" || true
}

encrypt_file() {
  local src="$1"
  age -r "$BACKUP_AGE_PUBLIC_KEY" -o "${src}.age" "$src"
  rm -f "$src"
  echo "${src}.age"
}

record_component() {
  local name="$1" file="$2" status="$3"
  local size=0
  if [[ -f "$file" ]]; then
    size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
    total_size=$((total_size + size))
  fi
  components+=("{\"name\":\"${name}\",\"file\":\"$(basename "$file")\",\"size\":${size},\"status\":\"${status}\"}")
}

# ── Setup ───────────────────────────────────────────────────────────────────

mkdir -p "$STAGING_DIR"
log "Starting backup: tier=${TIER} date=${DATE}"

# ── 1. PostgreSQL (all databases) ────────────────────────────────────────────

log "Backing up PostgreSQL (all databases)..."
PG_CONTAINER="$(find_container "$BACKUP_PG_CONTAINER_PATTERN")"
PG_FILE="${STAGING_DIR}/postgres-all.dump"

if [[ -n "$PG_CONTAINER" ]]; then
  if docker exec "$PG_CONTAINER" pg_dumpall \
    -U "${BACKUP_PG_USER:-postgres}" \
    --clean \
    > "$PG_FILE" 2>/dev/null; then
    PG_FILE="$(encrypt_file "$PG_FILE")"
    record_component "postgres-all" "$PG_FILE" "ok"
    log "PostgreSQL backup OK ($(du -h "$PG_FILE" | cut -f1))"
  else
    rm -f "$PG_FILE"
    errors+=("PostgreSQL dump failed")
    record_component "postgres-all" "$PG_FILE" "failed"
    log "ERROR: PostgreSQL dump failed"
  fi
else
  errors+=("PostgreSQL container not found (pattern: ${BACKUP_PG_CONTAINER_PATTERN})")
  record_component "postgres-all" "" "container_not_found"
  log "ERROR: PostgreSQL container not found"
fi

# ── 2. n8n binary data (Docker volume) ──────────────────────────────────
# n8n 2.x uses PostgreSQL (captured by pg_dumpall above).
# The /home/node/.n8n volume stores binary files: workflow attachments,
# community nodes, SSH keys. We tar the volume, excluding stale SQLite files.

log "Backing up n8n binary data..."
N8N_CONTAINER="$(find_container "$BACKUP_WORKFLOW_CONTAINER_PATTERN")"
N8N_FILE="${STAGING_DIR}/n8n-data.tar.gz"

if [[ -n "$N8N_CONTAINER" ]]; then
  if docker exec "$N8N_CONTAINER" tar -czf /tmp/n8n-data-backup.tar.gz \
    --exclude='*.sqlite' --exclude='database.sqlite*' \
    -C /home/node .n8n 2>/dev/null \
    && docker cp "${N8N_CONTAINER}:/tmp/n8n-data-backup.tar.gz" "$N8N_FILE" 2>/dev/null; then
    docker exec "$N8N_CONTAINER" rm -f /tmp/n8n-data-backup.tar.gz 2>/dev/null || true
    N8N_FILE="$(encrypt_file "$N8N_FILE")"
    record_component "n8n-data" "$N8N_FILE" "ok"
    log "n8n data backup OK ($(du -h "$N8N_FILE" | cut -f1))"
  else
    rm -f "$N8N_FILE"
    errors+=("n8n data backup failed")
    record_component "n8n-data" "$N8N_FILE" "failed"
    log "ERROR: n8n data backup failed"
  fi
else
  errors+=("n8n container not found (pattern: ${BACKUP_WORKFLOW_CONTAINER_PATTERN})")
  record_component "n8n-data" "" "container_not_found"
  log "ERROR: n8n container not found"
fi

# ── 3. Dokploy config (internal PostgreSQL) ────────────────────────────────

log "Backing up Dokploy config..."
DOKPLOY_CONTAINER="$(find_container "$BACKUP_DOKPLOY_PG_CONTAINER_PATTERN")"
DOKPLOY_FILE="${STAGING_DIR}/dokploy-config.dump"

if [[ -n "$DOKPLOY_CONTAINER" ]]; then
  if docker exec "$DOKPLOY_CONTAINER" pg_dump \
    -U "${BACKUP_DOKPLOY_PG_USER:-dokploy}" \
    --format=custom \
    --compress=9 \
    "${BACKUP_DOKPLOY_PG_DATABASE:-dokploy}" > "$DOKPLOY_FILE" 2>/dev/null; then
    DOKPLOY_FILE="$(encrypt_file "$DOKPLOY_FILE")"
    record_component "dokploy-config" "$DOKPLOY_FILE" "ok"
    log "Dokploy config backup OK"
  else
    rm -f "$DOKPLOY_FILE"
    errors+=("Dokploy PostgreSQL dump failed")
    record_component "dokploy-config" "$DOKPLOY_FILE" "failed"
    log "ERROR: Dokploy PostgreSQL dump failed"
  fi
else
  errors+=("Dokploy PostgreSQL container not found")
  record_component "dokploy-config" "" "container_not_found"
  log "ERROR: Dokploy PostgreSQL container not found"
fi

# ── 3b. Multica (dedicated PostgreSQL + uploads volume) ────────────────────

log "Backing up Multica database..."
MULTICA_PG_CONTAINER="$(find_container "multica-postgres")"
MULTICA_PG_FILE="${STAGING_DIR}/multica-postgres.dump"

if [[ -n "$MULTICA_PG_CONTAINER" ]]; then
  if docker exec "$MULTICA_PG_CONTAINER" pg_dump \
    -U multica \
    --format=custom \
    --compress=9 \
    multica > "$MULTICA_PG_FILE" 2>/dev/null; then
    MULTICA_PG_FILE="$(encrypt_file "$MULTICA_PG_FILE")"
    record_component "multica-postgres" "$MULTICA_PG_FILE" "ok"
    log "Multica database backup OK ($(du -h "$MULTICA_PG_FILE" | cut -f1))"
  else
    rm -f "$MULTICA_PG_FILE"
    errors+=("Multica PostgreSQL dump failed")
    record_component "multica-postgres" "$MULTICA_PG_FILE" "failed"
    log "ERROR: Multica PostgreSQL dump failed"
  fi
else
  errors+=("Multica PostgreSQL container not found")
  record_component "multica-postgres" "" "container_not_found"
  log "ERROR: Multica PostgreSQL container not found"
fi

log "Backing up Multica uploads..."
MULTICA_BE_CONTAINER="$(find_container "multica-backend")"
MULTICA_UP_FILE="${STAGING_DIR}/multica-uploads.tar.gz"

if [[ -n "$MULTICA_BE_CONTAINER" ]]; then
  if docker exec "$MULTICA_BE_CONTAINER" tar -czf /tmp/multica-uploads.tar.gz \
    -C /app/data uploads 2>/dev/null \
    && docker cp "${MULTICA_BE_CONTAINER}:/tmp/multica-uploads.tar.gz" "$MULTICA_UP_FILE" 2>/dev/null; then
    docker exec "$MULTICA_BE_CONTAINER" rm -f /tmp/multica-uploads.tar.gz 2>/dev/null || true
    MULTICA_UP_FILE="$(encrypt_file "$MULTICA_UP_FILE")"
    record_component "multica-uploads" "$MULTICA_UP_FILE" "ok"
    log "Multica uploads backup OK ($(du -h "$MULTICA_UP_FILE" | cut -f1))"
  else
    rm -f "$MULTICA_UP_FILE"
    errors+=("Multica uploads backup failed")
    record_component "multica-uploads" "$MULTICA_UP_FILE" "failed"
    log "ERROR: Multica uploads backup failed"
  fi
else
  errors+=("Multica backend container not found")
  record_component "multica-uploads" "" "container_not_found"
  log "ERROR: Multica backend container not found"
fi

# ── 4. Server config files ─────────────────────────────────────────────────

log "Backing up server config..."
SERVER_CFG_FILE="${STAGING_DIR}/server-config.tar.gz"

tar -czf "$SERVER_CFG_FILE" \
  --ignore-failed-read \
  /etc/ssh/sshd_config \
  /etc/sysctl.d/ \
  /etc/crowdsec/ \
  /etc/crowdsec/bouncers/ \
  /etc/docker/daemon.json \
  /etc/cron.d/backup-schedule \
  /etc/crontab \
  /var/spool/cron/crontabs/ \
  /etc/systemd/system/crowdsec-firewall-bouncer.service \
  /etc/dokploy/traefik/traefik.yml \
  /etc/apt/apt.conf.d/50unattended-upgrades \
  /etc/apt/apt.conf.d/20auto-upgrades \
  /etc/needrestart/needrestart.conf \
  /etc/modprobe.d/ \
  /home/main-user/.ssh/authorized_keys \
  /opt/backups/.env \
  /opt/backups/scripts/ \
  2>/dev/null || true

if [[ -s "$SERVER_CFG_FILE" ]]; then
  SERVER_CFG_FILE="$(encrypt_file "$SERVER_CFG_FILE")"
  record_component "server-config" "$SERVER_CFG_FILE" "ok"
  log "Server config backup OK"
else
  rm -f "$SERVER_CFG_FILE"
  errors+=("Server config archive empty")
  record_component "server-config" "$SERVER_CFG_FILE" "failed"
  log "WARNING: Server config archive empty"
fi

# ── 5. SSL certificates ───────────────────────────────────────────────────

log "Backing up SSL certificates..."
SSL_FILE="${STAGING_DIR}/ssl-certs.tar.gz"
ACME_PATH="${BACKUP_ACME_JSON_PATH:-/etc/dokploy/traefik/dynamic/acme.json}"

if [[ -f "$ACME_PATH" ]]; then
  tar -czf "$SSL_FILE" "$ACME_PATH" 2>/dev/null
  SSL_FILE="$(encrypt_file "$SSL_FILE")"
  record_component "ssl-certs" "$SSL_FILE" "ok"
  log "SSL certs backup OK"
else
  errors+=("acme.json not found at ${ACME_PATH}")
  record_component "ssl-certs" "" "not_found"
  log "WARNING: acme.json not found (SSL will auto-regenerate)"
fi

# ── 6. Traefik dynamic config ────────────────────────────────────────────

log "Backing up Traefik dynamic config..."
TRAEFIK_FILE="${STAGING_DIR}/traefik-dynamic-config.tar.gz"
TRAEFIK_DIR="/etc/dokploy/traefik/dynamic"

if [[ -d "$TRAEFIK_DIR" ]]; then
  tar -czf "$TRAEFIK_FILE" \
    --exclude='acme.json' \
    "$TRAEFIK_DIR"/*.yml \
    2>/dev/null
  if [[ -s "$TRAEFIK_FILE" ]]; then
    TRAEFIK_FILE="$(encrypt_file "$TRAEFIK_FILE")"
    record_component "traefik-dynamic-config" "$TRAEFIK_FILE" "ok"
    log "Traefik dynamic config backup OK"
  else
    rm -f "$TRAEFIK_FILE"
    errors+=("Traefik dynamic config archive empty")
    record_component "traefik-dynamic-config" "$TRAEFIK_FILE" "failed"
  fi
else
  errors+=("Traefik dynamic config dir not found")
  record_component "traefik-dynamic-config" "" "not_found"
fi

# ── 7. Beszel monitoring data ──────────────────────────────────────────

log "Backing up Beszel monitoring data..."
BESZEL_CONTAINER="$(find_container beszel-hub)"
BESZEL_FILE="${STAGING_DIR}/beszel-data.tar.gz"

if [[ -n "$BESZEL_CONTAINER" ]]; then
  # Beszel uses a minimal Go image without tar — copy via docker cp then tar on host
  BESZEL_TMP=$(mktemp -d)
  if docker cp "${BESZEL_CONTAINER}:/beszel_data" "$BESZEL_TMP/beszel_data" 2>/dev/null \
    && tar -czf "$BESZEL_FILE" -C "$BESZEL_TMP" beszel_data 2>/dev/null; then
    rm -rf "$BESZEL_TMP"
    BESZEL_FILE="$(encrypt_file "$BESZEL_FILE")"
    record_component "beszel-data" "$BESZEL_FILE" "ok"
    log "Beszel data backup OK ($(du -h "$BESZEL_FILE" | cut -f1))"
  else
    rm -rf "$BESZEL_TMP"
    rm -f "$BESZEL_FILE"
    errors+=("Beszel data backup failed")
    record_component "beszel-data" "$BESZEL_FILE" "failed"
    log "ERROR: Beszel data backup failed"
  fi
else
  record_component "beszel-data" "" "container_not_found"
  log "INFO: Beszel container not found (skipping)"
fi

# ── 7b. Agent state (Hermes) ─────────────────────────────────────────────
# The agent's state volume and its host folder (config, mounted files). Both
# trees keep their own root in the tarball, so they never overwrite each other.
# Caches the agent rebuilds on its own stay out: 2.5 of the volume's 2.6 GB.
# tar exits 1 when a live SQLite file changes mid-read; the WAL travels with it.

log "Backing up agent state..."
AGENT_VOLUMES_DIR="/var/lib/docker/volumes"
AGENT_FILE="${STAGING_DIR}/agent-state.tar.gz"
AGENT_CACHES=(hf pylibs .uv-cache home cache image_cache audio_cache lazy-packages bin .local sandboxes downloads)
agent_excludes=()
for dir in "${AGENT_CACHES[@]}"; do
  agent_excludes+=("--exclude=${BACKUP_AGENT_VOLUME}/_data/${dir}")
done

if [[ -d "${AGENT_VOLUMES_DIR}/${BACKUP_AGENT_VOLUME}/_data" && -d "$BACKUP_AGENT_DIR" ]]; then
  agent_rc=0
  tar -czf "$AGENT_FILE" "${agent_excludes[@]}" \
    -C "$AGENT_VOLUMES_DIR" "${BACKUP_AGENT_VOLUME}/_data" \
    -C "$(dirname "$BACKUP_AGENT_DIR")" "$(basename "$BACKUP_AGENT_DIR")" 2>/dev/null || agent_rc=$?
  if [[ $agent_rc -le 1 ]]; then
    AGENT_FILE="$(encrypt_file "$AGENT_FILE")"
    record_component "agent-state" "$AGENT_FILE" "ok"
    log "Agent state backup OK ($(du -h "$AGENT_FILE" | cut -f1))"
  else
    rm -f "$AGENT_FILE"
    errors+=("Agent state backup failed")
    record_component "agent-state" "$AGENT_FILE" "failed"
    log "ERROR: Agent state backup failed (tar exit ${agent_rc})"
  fi
else
  errors+=("Agent state not found")
  record_component "agent-state" "" "container_not_found"
  log "ERROR: Agent volume or folder not found"
fi

# ── 8. Dokploy application & compose configs ──────────────────────────

log "Backing up Dokploy app configs..."
DOKPLOY_APPS_FILE="${STAGING_DIR}/dokploy-apps-config.tar.gz"

tar -czf "$DOKPLOY_APPS_FILE" \
  --ignore-failed-read \
  /etc/dokploy/compose/ \
  /etc/dokploy/applications/ \
  /etc/dokploy/ssh/ \
  2>/dev/null || true

if [[ -s "$DOKPLOY_APPS_FILE" ]]; then
  DOKPLOY_APPS_FILE="$(encrypt_file "$DOKPLOY_APPS_FILE")"
  record_component "dokploy-apps-config" "$DOKPLOY_APPS_FILE" "ok"
  log "Dokploy apps config backup OK"
else
  rm -f "$DOKPLOY_APPS_FILE"
  errors+=("Dokploy apps config archive empty")
  record_component "dokploy-apps-config" "$DOKPLOY_APPS_FILE" "failed"
fi

# ── 9. System metadata (package lists, Docker state) ──────────────────

log "Backing up system metadata..."
METADATA_FILE="${STAGING_DIR}/system-metadata.tar.gz"
METADATA_TMP=$(mktemp -d)

dpkg --get-selections > "${METADATA_TMP}/dpkg-selections.txt" 2>/dev/null || true
pip3 list --format=freeze > "${METADATA_TMP}/pip-packages.txt" 2>/dev/null || true
docker network inspect dokploy-network > "${METADATA_TMP}/docker-network.json" 2>/dev/null || true
docker volume ls --format json > "${METADATA_TMP}/docker-volumes.json" 2>/dev/null || true

tar -czf "$METADATA_FILE" -C "$METADATA_TMP" . 2>/dev/null
rm -rf "$METADATA_TMP"

if [[ -s "$METADATA_FILE" ]]; then
  METADATA_FILE="$(encrypt_file "$METADATA_FILE")"
  record_component "system-metadata" "$METADATA_FILE" "ok"
  log "System metadata backup OK"
else
  rm -f "$METADATA_FILE"
  record_component "system-metadata" "$METADATA_FILE" "failed"
fi

# ── 10. Storage data (AllOnFire pictures) — weekly S3 sync ────────────────────
#
# This is the only component that never becomes a local file — it streams from
# `docker cp` straight to S3 — so record_component always measures it as 0 bytes
# and a daily manifest cannot show when the photos were last secured. The extra
# state below is what makes "last_sync" answerable on every run, not just the
# weekly ones.
MINIO_STATUS_FILE="/opt/backups/status/last-minio-sync"
minio_status="daily_skip"
minio_files=0
minio_last_sync="never"
minio_mirror_bytes=0

# The status file holds "<date> <bytes>" from the last successful sync, so a
# daily run can still report the mirror's date and size without touching S3.
if [[ -f "$MINIO_STATUS_FILE" ]]; then
  read -r minio_last_sync minio_mirror_bytes < "$MINIO_STATUS_FILE" || true
  minio_mirror_bytes="${minio_mirror_bytes:-0}"
fi

if [[ "$DRY_RUN" == "true" && ( "$TIER" == "weekly" || "$TIER" == "monthly" ) ]]; then
  # The mirror and its status file are what a real run changes: neither moves.
  log "[dry-run] Skipping storage S3 sync"
  minio_status="dry_run"
elif [[ "$TIER" == "weekly" || "$TIER" == "monthly" ]]; then
  log "Syncing storage data to S3 mirror..."
  MINIO_CONTAINER="$(find_container "$BACKUP_STORAGE_CONTAINER_PATTERN")"
  MINIO_SYNC_DIR="${STAGING_DIR}/minio-sync"

  if [[ -n "$MINIO_CONTAINER" ]]; then
    mkdir -p "$MINIO_SYNC_DIR"
    # Both the copy and the upload must succeed. Capturing the sync output in a
    # variable (rather than piping straight to grep) is what makes the aws exit
    # code reach this `if` — a pipeline reports grep's status, not aws's.
    if docker cp "${MINIO_CONTAINER}:/data/." "$MINIO_SYNC_DIR/" 2>/dev/null \
       && sync_out=$(aws s3 sync "$MINIO_SYNC_DIR/" \
            "s3://${BACKUP_S3_BUCKET}/minio-mirror/" \
            --storage-class GLACIER_IR 2>&1); then
      minio_status="ok"
      minio_files=$(grep -c "upload:" <<<"$sync_out" || true)
      minio_mirror_bytes=$(du -sb "$MINIO_SYNC_DIR" 2>/dev/null | cut -f1 || echo 0)
      minio_last_sync="$DATE"
      mkdir -p /opt/backups/status
      echo "${DATE} ${minio_mirror_bytes}" > "$MINIO_STATUS_FILE"
      rm -rf "$MINIO_SYNC_DIR"
      log "Storage S3 sync OK (${minio_files} new files, mirror $((minio_mirror_bytes / 1024 / 1024)) MB)"
    else
      minio_status="failed"
      rm -rf "$MINIO_SYNC_DIR"
      # Keep the manifest string literal — errors[] is concatenated into JSON
      # without escaping, so raw aws output here would break the webhook.
      errors+=("Storage data sync failed")
      log "ERROR: Storage data sync failed: ${sync_out:-docker cp failed}"
    fi
  else
    # Matches the n8n/postgres components: a container that should exist and
    # does not is a failure, not an informational skip.
    minio_status="container_not_found"
    errors+=("Storage container not found")
    log "ERROR: Storage container not found"
  fi
else
  log "INFO: Storage sync skipped (daily tier — photos mirrored weekly, last: ${minio_last_sync})"
fi

# Age of the mirror in days. Derived here rather than in the n8n template so the
# staleness rule lives somewhere testable and version-controlled. -1 = never run.
minio_age_days=-1
if [[ "$minio_last_sync" != "never" ]]; then
  minio_age_days=$(( ( $(date -d "$DATE" +%s) - $(date -d "$minio_last_sync" +%s) ) / 86400 ))
fi

record_component "storage-data" "s3://${BACKUP_S3_BUCKET}/minio-mirror/" "$minio_status"

# ── Upload to S3 ───────────────────────────────────────────────────────────

if [[ "$DRY_RUN" == "true" ]]; then
  log "[dry-run] Skipping S3 upload"
else
  log "Uploading to ${S3_PREFIX}..."
  upload_errors=0

  for f in "${STAGING_DIR}"/*.age; do
    [[ -f "$f" ]] || continue
    if ! aws s3 cp "$f" "${S3_PREFIX}/$(basename "$f")" \
      --storage-class GLACIER_IR \
      --quiet 2>/dev/null; then
      errors+=("S3 upload failed: $(basename "$f")")
      ((upload_errors++)) || true
      log "ERROR: Failed to upload $(basename "$f")"
    fi
  done

  if [[ $upload_errors -gt 0 ]]; then
    log "WARNING: ${upload_errors} file(s) failed to upload"
  fi
fi

# ── Generate manifest ──────────────────────────────────────────────────────

error_count=${#errors[@]}
if [[ $error_count -eq 0 ]]; then
  status="success"
  exit_code=0
elif [[ $error_count -lt 9 ]]; then
  status="partial_failure"
  exit_code=1
else
  status="total_failure"
  exit_code=2
fi

# Build errors JSON array
errors_json="[]"
if [[ $error_count -gt 0 ]]; then
  errors_json="["
  for i in "${!errors[@]}"; do
    [[ $i -gt 0 ]] && errors_json+=","
    errors_json+="\"${errors[$i]}\""
  done
  errors_json+="]"
fi

# Build components JSON array
components_json="["
for i in "${!components[@]}"; do
  [[ $i -gt 0 ]] && components_json+=","
  components_json+="${components[$i]}"
done
components_json+="]"

# Write manifest to staging dir too
MANIFEST="${STAGING_DIR}/manifest.json"
cat > "$MANIFEST" <<MANIFEST_EOF
{
  "date": "${DATE}",
  "timestamp": "${TIMESTAMP}",
  "tier": "${TIER}",
  "status": "${status}",
  "total_size_bytes": ${total_size},
  "storage": {
    "status": "${minio_status}",
    "last_sync": "${minio_last_sync}",
    "age_days": ${minio_age_days},
    "files_uploaded": ${minio_files},
    "mirror_bytes": ${minio_mirror_bytes}
  },
  "components": ${components_json},
  "errors": ${errors_json},
  "s3_prefix": "${S3_PREFIX}"
}
MANIFEST_EOF

# Output manifest to stdout
cat "$MANIFEST"

if [[ "$DRY_RUN" == "true" ]]; then
  log "[dry-run] Skipping S3 manifest upload, webhook notification, and local pruning"
  log "[dry-run] Staging dir preserved at ${STAGING_DIR}"
  log "[dry-run] Backup complete: status=${status} errors=${error_count}"
  exit "$exit_code"
fi

# Upload manifest (unencrypted — it contains no sensitive data)
aws s3 cp "$MANIFEST" "${S3_PREFIX}/manifest.json" --quiet 2>/dev/null || true

# ── Notify n8n via webhook ───────────────────────────────────────────────

BACKUP_WEBHOOK_URL="${BACKUP_WEBHOOK_URL:-}"
if [[ -n "$BACKUP_WEBHOOK_URL" ]]; then
  log "Sending notification to n8n..."
  curl -sf -X POST "$BACKUP_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "X-Backup-Token: ${BACKUP_WEBHOOK_TOKEN:-}" \
    -d @"$MANIFEST" --max-time 10 2>/dev/null || log "WARNING: n8n notification failed (non-critical)"
fi

# ── Prune old local staging ────────────────────────────────────────────────

log "Pruning local staging older than ${BACKUP_LOCAL_RETENTION_DAYS} days..."
find "$STAGING_BASE" -mindepth 1 -maxdepth 1 -type d \
  -mtime "+${BACKUP_LOCAL_RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null || true

# ── Marker file for cron fallback ──────────────────────────────────────────

mkdir -p /opt/backups/status
echo "$TIMESTAMP" > "/opt/backups/status/last-backup-${DATE}"

log "Backup complete: status=${status} errors=${error_count}"
exit "$exit_code"
