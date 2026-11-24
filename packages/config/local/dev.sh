#!/usr/bin/env bash
# `pnpm dev`: the Local stack, the Tailscale Services, then turbo's dev, test
# and the Vitest UI in one TUI. The Services go down when the TUI exits.
set -euo pipefail

tailscale_sh="$(dirname "${BASH_SOURCE[0]}")/tailscale.sh"

pnpm docker:up
bash "$tailscale_sh" on || echo "Tailscale is off: the Apps answer on localhost only"
trap 'bash "$tailscale_sh" off >/dev/null 2>&1' EXIT INT TERM
turbo run dev test //#test:ui --continue --ui=tui
