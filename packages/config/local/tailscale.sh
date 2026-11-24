#!/usr/bin/env bash
# Serves each dev App, the API and the cdn as a Tailscale Service, so a phone
# on the tailnet reaches them (ADR 0021).
#   tailscale.sh on    advertise the Services, then print their status
#   tailscale.sh off   reset every Service this Mac serves
set -euo pipefail

serve() {
  tailscale serve --service="svc:$1" --https=443 "$2"
}

case "${1:-}" in
  on)
    serve back-office http://localhost:3400
    serve laura http://localhost:3200
    serve cdn http://localhost:9010
    serve api http://localhost:3300
    tailscale serve status
    ;;
  off) tailscale serve reset ;;
  *)
    echo "usage: tailscale.sh on|off" >&2
    exit 2
    ;;
esac
