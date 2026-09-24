#!/usr/bin/env bash
# Entrypoint of the db-migrate image.
#
#   entrypoint.sh backup        custom-format pg_dump into /backups, verified
#                               with pg_restore; keeps the newest BACKUP_KEEP
#                               (default 14)
#   entrypoint.sh deploy        update (it validates first), and tag the
#                               release when the update applied something
#   entrypoint.sh <args...>     any Liquibase command: update, status --verbose,
#                               rollback --tag=v0.2.0, release-locks, ...
#
# Reads DATABASE_URL, the postgres:// URL every package uses. The password
# leaves it for LIQUIBASE_COMMAND_PASSWORD and PGPASSWORD only.
set -Eeuo pipefail
shopt -s inherit_errexit

trap 'echo "entrypoint: failed at line ${LINENO}: ${BASH_COMMAND}" >&2' ERR

# shellcheck source-path=SCRIPTDIR source=database-url.sh
source /liquibase/scripts/database-url.sh

readonly RELEASE_FILE=/liquibase/release/package.json
readonly BACKUP_DIR=/backups
readonly DEFAULT_BACKUP_KEEP=14
# ALTER TABLE takes an exclusive lock and queues every query behind it while it
# waits. Waiting at most this long fails the deploy instead of stalling the App.
readonly LOCK_TIMEOUT=10s

: "${DATABASE_URL:?DATABASE_URL is not set}"

jdbc="$(jdbc_url "$DATABASE_URL")"
# pgJDBC's `options` sets a server parameter for the session.
LIQUIBASE_COMMAND_URL="${jdbc}$([[ "$jdbc" == *\?* ]] && echo '&' || echo '?')options=-c%20lock_timeout%3D${LOCK_TIMEOUT}"
LIQUIBASE_COMMAND_USERNAME="$(url_user "$DATABASE_URL")"
LIQUIBASE_COMMAND_PASSWORD="$(url_password "$DATABASE_URL")"
export LIQUIBASE_COMMAND_URL LIQUIBASE_COMMAND_USERNAME LIQUIBASE_COMMAND_PASSWORD
LIBPQ_URL="$(libpq_url "$DATABASE_URL")"
readonly LIBPQ_URL
unset DATABASE_URL jdbc

release_version() {
  local version
  version="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' "$RELEASE_FILE")"
  if [[ -z "$version" ]]; then
    echo "entrypoint: no version in ${RELEASE_FILE}" >&2
    return 1
  fi
  printf '%s\n' "$version"
}

# `liquibase tag` rewrites the newest changelog row, so tagging a deploy that
# applied nothing would move the previous release's tag onto nothing new.
deploy() {
  local version pending tag
  version="$(release_version)"
  # update validates the changelog (checksums, preconditions) before it
  # applies anything, so a separate validate would only start another JVM.
  pending="$(liquibase status)"
  liquibase update
  # "1 changeset has not been applied", "2 changesets have not been applied".
  if ! grep -q "not been applied" <<<"$pending"; then
    echo "entrypoint: nothing to apply, release tag left where it was"
    return 0
  fi
  tag="v${version}"
  # ponytail: a same-version deploy with new changesets gets a timestamp
  # suffix; a release bump per production deploy keeps tags plain.
  # tag-exists prints its answer on stderr.
  if ! liquibase tag-exists --tag="$tag" 2>&1 | grep -q "does NOT exist"; then
    tag="${tag}-$(date -u +%Y%m%dT%H%M%SZ)"
  fi
  liquibase tag --tag="$tag"
}

# Dumps are written under a .partial name and renamed only once pg_restore can
# read them, so a failed or interrupted run never replaces a good dump and
# never counts towards the ones kept.
backup() {
  local keep="${BACKUP_KEEP:-$DEFAULT_BACKUP_KEEP}" file excess
  local -a dumps
  if [[ ! "$keep" =~ ^[1-9][0-9]*$ ]]; then
    echo "entrypoint: BACKUP_KEEP must be a positive integer" >&2
    return 1
  fi
  file="${BACKUP_DIR}/allonfire-$(date -u +%Y%m%dT%H%M%S%NZ).dump"
  partial="${file}.partial"
  trap 'rm -f -- "$partial"' EXIT
  umask 077
  PGPASSWORD="$LIQUIBASE_COMMAND_PASSWORD" pg_dump --format=custom \
    --no-password --dbname="$LIBPQ_URL" --file="$partial"
  pg_restore --list "$partial" >/dev/null
  mv -- "$partial" "$file"
  # The timestamp sorts chronologically, and so does the glob.
  shopt -s nullglob
  dumps=("$BACKUP_DIR"/allonfire-*.dump)
  excess=$((${#dumps[@]} - keep))
  if ((excess > 0)); then
    rm -- "${dumps[@]:0:excess}"
  fi
  echo "entrypoint: backup written to ${file}, keeping the newest ${keep}"
}

case "${1:-}" in
  backup)
    backup
    exit 0
    ;;
  deploy)
    deploy
    exit 0
    ;;
esac

# exec: Liquibase becomes PID 1 and receives the stop signal itself.
exec liquibase "$@"
