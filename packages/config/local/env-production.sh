#!/usr/bin/env bash
# Reads a git-ignored .env.production without ever printing a value: values
# leave only through the clipboard (`copy`) or `gh`'s stdin (`gh-secret`).
#   keys      <file>                 the key names, one per line
#   check     <file>                 each empty key; exits 1 when any is empty
#   copy      <file> <key>           the value onto the macOS clipboard
#   gh-secret <file> <key> <env>     the value into `gh secret set <key> --env <env>`
set -euo pipefail

usage() {
  echo "usage: env-production.sh keys|check <file> | copy <file> <key> | gh-secret <file> <key> <env>" >&2
  exit 2
}

[ $# -ge 2 ] || usage
command=$1
file=$2
[ -f "$file" ] || { echo "env-production: no file $file" >&2; exit 1; }

# Prints "KEY<TAB>value" for each assignment, quotes stripped. Only ever piped
# into the commands below, never to the terminal.
entries() {
  local line key value
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line#"${line%%[![:space:]]*}"}
    case $line in '' | '#'*) continue ;; esac
    [[ $line == *=* ]] || continue
    key=${line%%=*}
    value=${line#*=}
    if [[ $value =~ ^\"(.*)\"$ || $value =~ ^\'(.*)\'$ ]]; then
      value=${BASH_REMATCH[1]}
    fi
    printf '%s\t%s\n' "$key" "$value"
  done <"$file"
}

# The value of $1, exiting 1 (naming only the key) when it is missing or empty.
value_of() {
  local key value
  while IFS=$'\t' read -r key value; do
    if [ "$key" = "$1" ] && [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done < <(entries)
  echo "env-production: $1 is missing or empty in $file" >&2
  return 1
}

case $command in
  keys) entries | cut -f1 ;;
  check)
    empty=$(entries | awk -F'\t' '$2 == "" { print $1 }')
    [ -z "$empty" ] || { echo "$empty"; exit 1; }
    ;;
  copy)
    [ $# -eq 3 ] || usage
    value=$(value_of "$3")
    printf '%s' "$value" | pbcopy
    echo "copied $3"
    ;;
  gh-secret)
    [ $# -eq 4 ] || usage
    value=$(value_of "$3")
    printf '%s' "$value" | gh secret set "$3" --env "$4" >/dev/null
    echo "set $3 on $4"
    ;;
  *) usage ;;
esac
