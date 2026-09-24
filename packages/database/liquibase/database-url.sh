# shellcheck shell=bash
# Splits the postgres:// DATABASE_URL every package reads into what the tools
# in the db-migrate image need, keeping the password out of every URL:
#   jdbc_url      JDBC URL for Liquibase, no credentials
#   libpq_url     postgresql:// URL for pg_dump, user but no password
#   url_user      the user, percent-decoded
#   url_password  the password, percent-decoded
# The password then travels in LIQUIBASE_COMMAND_PASSWORD, which Liquibase
# masks, or PGPASSWORD, which never reaches a command line or `ps`.
#
# Sourced, never executed. Also sourced by the tests on macOS, so it must run
# on bash 3.2. Nothing here echoes the URL: it holds a password.

_POSTGRES_URL='^postgres(ql)?://([^:@/]+)(:([^@/]*))?@([^/?]+)/([^?]+)(\?(.*))?$'

# _parse_url <url>: fills BASH_REMATCH, or fails with a message that does not
# repeat the URL.
_parse_url() {
  if [[ ! "$1" =~ $_POSTGRES_URL ]]; then
    echo "database-url: DATABASE_URL is not a postgres:// URL" >&2
    return 1
  fi
}

# _percent_decode <text>: %XX escapes become their bytes. Backslashes are
# doubled first so %b does not read a literal one as an escape.
_percent_decode() {
  local text="${1//\\/\\\\}"
  printf '%b' "${text//%/\\x}"
}

# _query_suffix <query>: "?a=1&b=2" without the parameters only Prisma's
# connector reads; libpq rejects an unknown one, which would fail pg_dump.
# sslpassword is Prisma's PKCS12 password, meaningless once sslidentity is
# gone, and a secret pg_dump's command line would show. Empty when nothing is
# left.
_query_suffix() {
  local params="" pair pairs=()
  # `read -a`, not an unquoted expansion: a `*`, `?` or `[` in a value would
  # otherwise glob against the working directory.
  [[ -n "$1" ]] && IFS='&' read -r -a pairs <<<"$1"
  for pair in ${pairs[@]+"${pairs[@]}"}; do
    case "${pair%%=*}" in
      schema | connection_limit | pool_timeout | socket_timeout | pgbouncer | \
        statement_cache_size | sslidentity | sslpassword | sslaccept) ;;
      # Prisma's sslcert is the server's CA; libpq and pgJDBC read sslcert as
      # the client certificate and take the CA as sslrootcert.
      sslcert) params+="${params:+&}sslrootcert=${pair#*=}" ;;
      *) params+="${params:+&}${pair}" ;;
    esac
  done
  printf '%s' "${params:+?$params}"
}

# jdbc_url <url>: jdbc:postgresql://host[:port]/db[?params]
jdbc_url() {
  _parse_url "$1" || return 1
  printf 'jdbc:postgresql://%s/%s%s\n' "${BASH_REMATCH[5]}" \
    "${BASH_REMATCH[6]}" "$(_query_suffix "${BASH_REMATCH[8]}")"
}

# libpq_url <url>: postgresql://user@host[:port]/db[?params]. The user stays
# percent-encoded: libpq decodes URIs itself.
libpq_url() {
  _parse_url "$1" || return 1
  printf 'postgresql://%s@%s/%s%s\n' "${BASH_REMATCH[2]}" "${BASH_REMATCH[5]}" \
    "${BASH_REMATCH[6]}" "$(_query_suffix "${BASH_REMATCH[8]}")"
}

# url_user <url>: the user, decoded.
url_user() {
  _parse_url "$1" || return 1
  _percent_decode "${BASH_REMATCH[2]}"
  printf '\n'
}

# url_password <url>: the password, decoded; empty when the URL has none.
url_password() {
  _parse_url "$1" || return 1
  _percent_decode "${BASH_REMATCH[4]}"
  printf '\n'
}
