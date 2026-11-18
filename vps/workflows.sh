#!/usr/bin/env bash
#
# workflows.sh — Version the workflows that send the VPS's messages
#
# Usage: workflows.sh [--local] export [name…]   pull workflows from the service into ./workflows/ (all, or the names given)
#        workflows.sh [--local] import <file>     load one back into the service
#
# Runs on the Mac over `ssh main-vps`; with --local, against the Local workflow service
# (the `allonfire-workflow` container) with no ssh. The committed JSON holds
# placeholders where real values were (Telegram chat ID, webhook path,
# keep-alive URL, webhook and credential IDs; `lib/redact.jq` swaps them in);
# `import` fills them in next to the service itself, through `lib/workflow.sh`, which this
# script runs there: on the server from /opt/backups/.env, Locally from the
# git-ignored vps/.env (the same keys, Local's values), so a real value never
# reaches the repo.

set -euo pipefail

HOST="main-vps"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/vps/workflows"
LIB="$ROOT/vps/lib/workflow.sh"
REDACT="$ROOT/vps/lib/redact.jq"
NAMES=(backup-notification error-alert notifications services-keep-alive topic-discovery)
# What lib/workflow.sh exits with when the service has no such workflow.
NOT_FOUND=3
USAGE="Usage: workflows.sh [--local] export [name…] | import <file>"

MODE=remote
if [[ "${1:-}" == "--local" ]]; then
  MODE=local
  shift
fi

# The env file the values come from, on the target: the same keys in both.
if [[ "$MODE" == local ]]; then ENV_PATH="$ROOT/vps/.env"; else ENV_PATH=/opt/backups/.env; fi

# Runs one command of lib/workflow.sh where the service lives: the server over ssh, or here.
on_target() {
  if [[ "$MODE" == local ]]; then bash "$LIB" "$@"; else ssh "$HOST" bash -s -- "$@" <"$LIB"; fi
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

export_all() {
  local name id raw status file
  mkdir -p "$DIR"
  for name in "${@:-${NAMES[@]}}"; do
    id="$(workflow_id "$name")"
    file="$DIR/$name.json"
    status=0
    raw="$(on_target export_workflow "$ENV_PATH" "$id")" || status=$?
    # The Services keep-alive exists on the VPS only after its first import: a
    # workflow the service does not have is skipped, never written as an empty file.
    # Anything else that failed (ssh, Docker, the service) stops here with what it said.
    if [[ "$status" -eq "$NOT_FOUND" ]]; then
      echo "skipped $name: the service does not have it"
      continue
    fi
    [[ "$status" -eq 0 ]] || exit "$status"
    raw="$(jq --indent 2 -f "$REDACT" <<<"$raw")"
    # Local never activates a schedule, so its export says inactive: the
    # committed flag stays, or the next import would switch it off in Production.
    if [[ "$MODE" == local && -f "$file" ]]; then
      raw="$(jq --indent 2 --slurpfile old "$file" '.active = $old[0].active' <<<"$raw")"
    fi
    printf '%s\n' "$raw" >"$file"
    echo "exported $name"
  done
}

# Where the workflow waits on the target, until the exit removes it.
WORKDIR=""
discard_workdir() {
  [[ -z "$WORKDIR" ]] || on_target discard "$WORKDIR"
}

import_one() {
  local file="$1" name id
  name="$(basename "$file" .json)"
  id="$(workflow_id "$name")"
  WORKDIR="$(on_target workdir)"
  trap discard_workdir EXIT
  put "$file" "$WORKDIR/in.json"
  on_target import_workflow "$ENV_PATH" "$MODE" "$ROOT" "$WORKDIR" "$id"
}

case "${1:-}" in
  export) shift; export_all "$@" ;;
  import) [[ -n "${2:-}" ]] || { echo "$USAGE" >&2; exit 1; }; import_one "$2" ;;
  *) echo "$USAGE" >&2; exit 1 ;;
esac
