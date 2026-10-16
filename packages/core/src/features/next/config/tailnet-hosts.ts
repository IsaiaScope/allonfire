import { execFileSync } from "node:child_process";
import { z } from "zod";
import { parseJsonWith } from "../../../shared/utils/json";

/** Long enough for a running daemon to answer, short enough not to stall `next dev`. */
const STATUS_TIMEOUT_MS = 2000;

/** The part of `tailscale status --json` read here; the suffix is empty until signed in. */
const tailscaleStatusSchema = z.object({ MagicDNSSuffix: z.string() });

/**
 * Every MagicDNS name on this machine's tailnet (`*.tailnet.ts.net`), where
 * `pnpm dev:tailscale` serves each dev App as a Tailscale Service
 * (`back-office.tailnet.ts.net`): the only tailnet addresses the dev server
 * lets in. One pattern, so a new Service needs no change here. None while
 * Tailscale is signed out, not running or not installed.
 */
export const tailnetHosts = (): string[] => {
  try {
    const status = execFileSync("tailscale", ["status", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: STATUS_TIMEOUT_MS,
    });
    const tailnet = parseJsonWith(status, tailscaleStatusSchema).MagicDNSSuffix;
    return tailnet ? [`*.${tailnet}`] : [];
  } catch {
    return [];
  }
};
