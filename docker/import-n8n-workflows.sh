#!/bin/sh
set -e

COMPOSE_FILE="docker/docker-compose.dev.yml"
WORKFLOW_DIR="n8n/workflows"

# Wait for n8n to be ready (max 30s)
echo "Waiting for n8n to be ready..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T n8n wget -qO- http://localhost:5678/healthz >/dev/null 2>&1; then
    echo "n8n is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "n8n did not start in time"
    exit 1
  fi
  sleep 1
done

# Import each non-stub workflow
workflow_id=1
for f in "$WORKFLOW_DIR"/*.json; do
  [ ! -f "$f" ] && continue

  # Skip stubs (files with empty nodes array)
  if grep -q '"nodes":\s*\[\s*\]' "$f"; then
    echo "Skipping stub: $(basename "$f")"
    continue
  fi

  echo "Importing: $(basename "$f")"

  # Inject an id field if missing (n8n CLI requires it)
  tmpfile="/tmp/n8n-import-$workflow_id.json"
  python3 -c "
import json, sys
with open('$f') as fh:
    wf = json.load(fh)
if 'id' not in wf:
    wf['id'] = '$workflow_id'
with open('$tmpfile', 'w') as fh:
    json.dump(wf, fh)
"

  docker compose -f "$COMPOSE_FILE" cp "$tmpfile" n8n:/home/node/workflow.json
  docker compose -f "$COMPOSE_FILE" exec -T -u root n8n chown node:node /home/node/workflow.json
  docker compose -f "$COMPOSE_FILE" exec -T n8n n8n import:workflow --input=/home/node/workflow.json
  rm -f "$tmpfile"

  workflow_id=$((workflow_id + 1))
done

echo "Done! Workflows imported."
