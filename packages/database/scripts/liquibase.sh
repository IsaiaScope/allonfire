#!/usr/bin/env bash
# Builds the db-migrate image Production runs and runs it against the local
# DATABASE_URL, so Local, CI and Production share one Liquibase. Arguments go
# to the image's entrypoint: `update`, `status --verbose`, `deploy`, `backup`.
# DB_BACKUPS_VOLUME names a Docker volume to mount at /backups; BACKUP_KEEP is
# passed through when set.
set -Eeuo pipefail

package_dir="$(cd "$(dirname "$0")/.." && pwd)"
repo_root="$(cd "$package_dir/../.." && pwd)"

# Read .env the way Node and Prisma do, not with `source`: bash would expand a
# `$` in the password and read an unquoted `&` as a background job.
if [[ -z "${DATABASE_URL:-}" && -f "$package_dir/.env" ]]; then
  DATABASE_URL="$(node --env-file="$package_dir/.env" \
    --print 'process.env.DATABASE_URL ?? ""')"
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"

# Inside the container, localhost is the container itself. Exported and
# passed to docker by name only, so the password never reaches a command line
# (and `ps`).
DATABASE_URL="$(sed -E 's#@(localhost|127\.0\.0\.1)([:/])#@host.docker.internal\2#' <<<"$DATABASE_URL")"
export DATABASE_URL

# Build from a staging copy: on exFAT, macOS keeps metadata in AppleDouble
# `._*` files whose attributes BuildKit cannot read, failing the build.
context="$(mktemp -d)"
trap 'rm -rf "$context"' EXIT
mkdir -p "$context/packages/database"
cp "$repo_root/package.json" "$context/"
rsync -a --exclude='._*' --exclude='.DS_Store' --exclude='tests' \
  "$package_dir/changelog" "$package_dir/liquibase" "$context/packages/database/"

docker build --quiet --tag allonfire-db-migrate \
  --file "$context/packages/database/liquibase/Dockerfile" "$context" >/dev/null

volume=()
if [[ -n "${DB_BACKUPS_VOLUME:-}" ]]; then
  volume=(--volume "${DB_BACKUPS_VOLUME}:/backups")
fi

# The same confinement Production uses: read-only root filesystem, no Linux
# capabilities, no privilege escalation; the JVM gets a scratch /tmp.
# `${volume[@]+...}`: an empty array under `set -u` fails on macOS bash 3.2.
docker run --rm --init \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  --add-host=host.docker.internal:host-gateway \
  --env DATABASE_URL --env BACKUP_KEEP \
  ${volume[@]+"${volume[@]}"} \
  allonfire-db-migrate "$@"
