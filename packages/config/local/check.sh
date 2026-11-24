#!/usr/bin/env bash
# The pre-commit hook's check: every Stage but build (`pnpm check`), narrowed
# to what this commit changes and the packages that read it, with Turbo's
# remote cache on. The cache token is a Vercel access token with no expiration
# kept in the root `.env` (`.env.example` names the keys); without it the check
# still runs, uncached.
#   check.sh [env-file]   the file defaults to the repo's root .env
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
env_file="${1:-$root/.env}"

# Read the file the way Node and Prisma do, not with `source`: bash would
# expand a `$` in the token and read an unquoted `&` as a background job. A
# value already in the environment wins: Node's --env-file never overrides it.
from_file() {
  [[ -f "$env_file" ]] || return 0
  node --env-file="$env_file" --print "process.env.$1 ?? ''"
}

token="${TURBO_TOKEN:-$(from_file TURBO_TOKEN)}"
team="${TURBO_TEAM:-$(from_file TURBO_TEAM)}"

if [[ -n "$token" && -n "$team" ]]; then
  export TURBO_TOKEN="$token" TURBO_TEAM="$team"
else
  echo "Turbo remote cache is off: put TURBO_TOKEN and TURBO_TEAM in .env (see .env.example)" >&2
fi

# What --affected diffs against: HEAD, so only this commit's changes (the
# working tree counts) and their dependents run. Earlier commits on the branch
# passed their own hooks; CI diffs against the PR's base.
export TURBO_SCM_BASE=HEAD
cd "$root"
exec pnpm check --affected
