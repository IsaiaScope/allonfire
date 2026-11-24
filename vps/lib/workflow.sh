#!/usr/bin/env bash
#
# workflow.sh — what workflows.sh runs where the workflow service lives: the server over ssh, or the
# Mac with --local. workflows.sh ships this file (`bash -s -- <command> …`),
# then names one command; the last line runs it.
#
#   workdir                                       a private folder on this side; prints its path
#   discard <workdir>                             removes it
#   export  <env> <id>                            prints one workflow as the service exports it
#   import  <env> <mode> <root> <workdir> <id>    fills <workdir>/in.json and imports it
#
# <env> is the env file on this side. `export` exits 3 when the service has no such
# workflow; any other failure is a real one and shows what the service said.

set -euo pipefail
umask 077

readonly NOT_FOUND=3
# The workflow service's own command line, inside its container.
readonly CLI=n8n
readonly HEALTH_TRIES=30
readonly HEALTH_URL=http://127.0.0.1:5678/healthz

fail() {
  echo "workflows.sh: $*" >&2
  exit 1
}

# The value of KEY ($2) in the env file ($1): one pair of quotes off, no more.
env_value() {
  local value
  value="$({ grep -m1 "^$2=" "$1" || true; } | cut -d= -f2-)"
  value="${value#[\"\']}"
  printf '%s' "${value%[\"\']}"
}

# The name of the running workflow container; Swarm renames it at every restart.
container_name() {
  local pattern names
  pattern="$(env_value "$ENV_FILE" BACKUP_WORKFLOW_CONTAINER_PATTERN)"
  names="$(docker ps --format '{{.Names}}')"
  grep -m1 -- "${pattern:-workflow}" <<<"$names" || fail "no running container matches '${pattern:-workflow}'"
}

# Sets ENV_FILE, C (the workflow container) and CDIR (a private folder in
# it, gone on exit). The folder is the node user's own: a file written there is
# readable by the service and by nobody else, with no root and no permission changes.
connect() {
  ENV_FILE="$1"
  C="$(container_name)"
  CDIR="$(docker exec "$C" mktemp -d)"
  trap 'docker exec "$C" rm -rf "$CDIR" || true' EXIT
}

# Runs the service CLI in the container; its output shows only when it fails.
workflow_cli() {
  local out
  out="$(docker exec "$C" "$CLI" "$@" 2>&1)" || {
    printf '%s\n' "$out" >&2
    return 1
  }
}

# Puts the file $1 at the container path $2, readable by its owner only.
to_container() {
  docker exec -i "$C" sh -c 'umask 077 && cat > "$1"' sh "$2" <"$1"
}

# {credential name: id}: only the id and the name leave the export.
credential_ids() {
  local out
  out="$(docker exec "$C" "$CLI" export:credentials --all --output="$CDIR/credentials.json" 2>&1)" || {
    # A fresh service has none; that is an empty map, not a failure.
    [[ "$out" == *"No credentials found"* ]] && { echo '{}'; return 0; }
    printf '%s\n' "$out" >&2
    return 1
  }
  docker exec "$C" cat "$CDIR/credentials.json" | jq 'map({(.name): .id}) | add // {}'
}

# Copies workflow $1 out of the service into the container file $2; returns NOT_FOUND
# when the service has no such workflow.
fetch_workflow() {
  local out
  out="$(docker exec "$C" "$CLI" export:workflow --id="$1" --output="$2" 2>&1)" || {
    [[ "$out" == *"No workflows found"* ]] && return "$NOT_FOUND"
    printf '%s\n' "$out" >&2
    return 1
  }
}

# Polls the container that answers now (Swarm replaced the container) until it is up.
wait_for_service() {
  local tries=0
  until docker exec "$(container_name)" wget -qO /dev/null "$HEALTH_URL" 2>/dev/null; do
    tries=$((tries + 1))
    [[ "$tries" -lt "$HEALTH_TRIES" ]] || fail "the workflow service did not answer $HEALTH_URL after the restart"
    sleep 2
  done
}

# A placeholder the file holds and the env leaves empty would be imported as
# an empty value and fail at its first run (04:00 for the keep-alive): refuse.
# need <file> <placeholder> <value> <env key>
need() {
  if jq -e --arg p "$2" '[.nodes[] | .. | strings] | any(. == $p)' "$1" >/dev/null && [[ -z "$3" ]]; then
    fail "$4 is empty in $ENV_FILE"
  fi
}

# Local only: every credential the workflow names is written from vps/.env (the
# keep-alive token from the API's own apps/api/.env, one source; a rotated token
# lands on the next import), under the ID it already has; one with no value
# there is created empty and its secret typed in the workflow editor.
# The tokens travel in jq's environment, never its arguments (`ps` shows those).
# write_local_credentials <workflow file> <root> <{name: id}> <workdir>
write_local_credentials() {
  local new="$4/credentials.json"
  ALERTS="$(env_value "$ENV_FILE" BACKUP_TELEGRAM_BOT_TOKEN)" \
    ALLONFIRE="$(env_value "$ENV_FILE" BACKUP_TELEGRAM_ALLONFIRE_BOT_TOKEN)" \
    WEBHOOK="$(env_value "$ENV_FILE" BACKUP_WEBHOOK_TOKEN)" \
    KEEP_ALIVE="$(env_value "$2/apps/api/.env" API_KEEP_ALIVE_TOKEN)" \
    jq --argjson have "$3" \
    '{"Bot - Main VPS Alerts": $ENV.ALERTS, "allonfire_bot": $ENV.ALLONFIRE, "X-Backup-Token": $ENV.WEBHOOK,
      "Keep-alive Token": (if $ENV.KEEP_ALIVE == "" then "" else "Bearer " + $ENV.KEEP_ALIVE end)} as $secrets
     | [.nodes[].credentials // {} | to_entries[] | {type: .key, name: .value.name}] | unique
     | map(. + {id: ($have[.name] // ("loc" + (.name | gsub("[^A-Za-z0-9]"; "") | .[0:30]))),
                data: (($secrets[.name] // "") as $secret
                       | if .type == "telegramApi" then {accessToken: $secret, baseUrl: "https://api.telegram.org"}
                         elif .type == "httpHeaderAuth" then {name: (if (.name | startswith("X-")) then .name else "Authorization" end), value: $secret}
                         else {} end)})' "$1" >"$new"
  [[ "$(jq length "$new")" -gt 0 ]] || return 0
  to_container "$new" "$CDIR/credentials-in.json"
  workflow_cli import:credentials --input="$CDIR/credentials-in.json"
  jq -r '.[] | "credential " + .name + ": " + (if (.data.accessToken // .data.value) == "" then "empty, type its secret in the workflow editor" else "filled from vps/.env" end)' "$new"
}

# Import leaves a workflow inactive; publish it again when the file says active.
# The CLI only writes the database: a running service registers an active workflow's
# webhooks when it starts, so without a restart they answer 404 (the backup
# notice was dead from 2026-11-02 to 2026-11-09). Restart through Swarm, never
# on the task container: Swarm would start a replacement beside the old task.
# Locally a schedule never goes active: it would send real mail and alerts at
# 04:00 whenever the Mac and the API happen to be up.
# publish <workflow id> <mode> <root> <workflow file>
publish() {
  local active
  active="$(jq -r '.active' "$4")"
  if [[ "$2" == local ]] && jq -e '[.nodes[].type] | any(. == "n8n-nodes-base.scheduleTrigger")' "$4" >/dev/null; then
    active=false
  fi
  [[ "$active" == true ]] || return 0
  workflow_cli publish:workflow --id="$1"
  if [[ "$2" == local ]]; then
    docker compose -p allonfire -f "$3/docker/docker-compose.dev.yml" restart workflow >/dev/null
  else
    docker service update --force "$(docker inspect -f '{{index .Config.Labels "com.docker.swarm.service.name"}}' "$C")" >/dev/null
  fi
  wait_for_service
}

# The live workflow's webhook ID, so its URL does not move; a new one when the service
# does not have the workflow yet.
webhook_id_of() {
  local status=0
  fetch_workflow "$1" "$CDIR/live.json" || status=$?
  case "$status" in
    0) docker exec "$C" cat "$CDIR/live.json" | jq -r '(if type == "array" then .[0] else . end) | [.nodes[] | .webhookId // empty][0] // ""' ;;
    "$NOT_FOUND") ;;
    *) exit 1 ;;
  esac
}

workdir() {
  mktemp -d
}

discard() {
  rm -rf "$1"
}

export_workflow() {
  connect "$1"
  fetch_workflow "$2" "$CDIR/workflow.json" || exit $?
  docker exec "$C" cat "$CDIR/workflow.json"
}

import_workflow() {
  local mode="$2" root="$3" dir="$4" id="$5"
  local in="$dir/in.json" out="$dir/out.json"
  local chat url webhook_path keep_alive webhook_id creds
  connect "$1"
  chat="$(env_value "$ENV_FILE" BACKUP_TELEGRAM_CHAT_ID)"
  url="$(env_value "$ENV_FILE" BACKUP_WEBHOOK_URL)"
  webhook_path=""
  [[ "$url" == */webhook/* ]] && webhook_path="${url##*/webhook/}"
  keep_alive="$(env_value "$ENV_FILE" BACKUP_KEEP_ALIVE_URL)"

  need "$in" "<telegram-chat-id>" "$chat" BACKUP_TELEGRAM_CHAT_ID
  need "$in" "<backup-webhook-path>" "$webhook_path" BACKUP_WEBHOOK_URL
  need "$in" "<keep-alive-url>" "$keep_alive" BACKUP_KEEP_ALIVE_URL

  creds="$(credential_ids)"
  if [[ "$mode" == local ]]; then
    write_local_credentials "$in" "$root" "$creds" "$dir"
    creds="$(credential_ids)"
  fi

  webhook_id="$(webhook_id_of "$id")"
  [[ -n "$webhook_id" ]] || webhook_id="$(docker exec "$C" cat /proc/sys/kernel/random/uuid)"

  jq --arg chat "$chat" --arg path "$webhook_path" --arg webhook "$webhook_id" \
    --arg keepAlive "$keep_alive" --argjson creds "$creds" \
    '.nodes |= map(
       (if .parameters.chatId? == "<telegram-chat-id>" then .parameters.chatId = $chat else . end)
       | (if .parameters.path? == "<backup-webhook-path>" then .parameters.path = $path else . end)
       | (if .parameters.url? == "<keep-alive-url>" then .parameters.url = $keepAlive else . end)
       | (if .webhookId? == "<webhook-id>" then .webhookId = $webhook else . end)
       | (if .credentials? then .credentials |= map_values(.id = $creds[.name]) else . end))' \
    "$in" >"$out"

  to_container "$out" "$CDIR/workflow-in.json"
  workflow_cli import:workflow --input="$CDIR/workflow-in.json"
  publish "$id" "$mode" "$root" "$in"
  echo "imported $id ($mode)"
}

"$@"
