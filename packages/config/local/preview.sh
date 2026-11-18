#!/usr/bin/env bash
# The production build of the Next App it runs in, served like the Docker image
# (standalone), with the development env files. An App's `preview` script:
#   bash ../../packages/config/local/preview.sh <port>
# pnpm runs it in the App's folder; the folder's name is the App's.
set -euo pipefail

port="${1:?usage: preview.sh <port>}"
app="$(basename "$PWD")"
standalone=".next/standalone/apps/$app"

set -a
# shellcheck source=/dev/null
. ./.env.development
# shellcheck source=/dev/null
[[ ! -f .env.development.local ]] || . ./.env.development.local
set +a

pnpm build
cp -R .next/static "$standalone/.next/"
cp -R public "$standalone/"
PORT="$port" node "$standalone/server.js"
