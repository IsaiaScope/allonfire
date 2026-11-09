import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { REPO } from "../../local/repo";

/** An e2e run's own values: what it names, what it runs and the tags its tests take. */
export const E2E = {
  /**
   * The CLI that makes, names and drops each thing an e2e run owns: the
   * folder of the package holding it, and its script there.
   */
  CLI: {
    BUCKET: { dir: resolve(REPO.PACKAGES, "storage"), script: "test-bucket" },
    DATABASE: {
      dir: resolve(REPO.PACKAGES, "database"),
      script: "test-database",
    },
  },
  /** What the keep-alive call takes: the workflow service's token (32 characters or more) and the owner's address. */
  KEEP_ALIVE: {
    RECIPIENT: "keep-alive@allonfire.test",
    TOKEN: "e2e-keep-alive-token-not-a-secret",
  },
  /** The label of an e2e run's Test database and bucket, beside its stamp. */
  LABEL: "e2e",
  /**
   * The fake mail provider an e2e run's API sends through (slot
   * `FIXTURE.MAIL_PROVIDER.slot`): the key it takes, the paths it answers
   * and the throwaway certificate it serves with, which the API trusts
   * through `NODE_EXTRA_CA_CERTS` (a provider's URL must be https).
   */
  MAIL_SINK: {
    CERT: resolve(tmpdir(), "allonfire-e2e-mail-sink", "cert.pem"),
    CERT_KEY: resolve(tmpdir(), "allonfire-e2e-mail-sink", "key.pem"),
    KEY: "e2e-mail-sink-key-not-a-secret",
    PATH: {
      ATTEMPTS: "/attempts",
      METRICS: "/emails/metrics",
      SEND: "/emails",
      SENT: "/sent",
    },
    /**
     * A recipient whose local part starts with `<label>-` makes the sink
     * misbehave: `QUOTA` is out of quota on the first provider (the second
     * takes it), `REFUSED` is refused by both.
     */
    RECIPIENT: { QUOTA: "quota", REFUSED: "refused" },
    /** The second provider is the same sink, one path down. */
    SECOND_PREFIX: "/second",
    /** Which provider a request came through. */
    VIA: { FIRST: "first", SECOND: "second" },
  },
  /**
   * Tags an e2e test takes (`test(name, { tag }, ...)`). `CHROMIUM_ONLY`: the
   * WebKit projects leave it out, for what Playwright drives in Chromium only
   * (a page under a service worker, reloaded offline).
   */
  TAG: {
    CHROMIUM_ONLY: "@chromium-only",
  },
} as const;

/**
 * The arguments of one e2e CLI call after `pnpm`: `-s -C <dir> <script>
 * <command> e2e <stamp>`. `-C`, not `--filter`: a filtered run prints a
 * banner into the captured name.
 */
export const e2eCliArgs = (
  { dir, script }: { dir: string; script: string },
  command: string,
  stamp: string
): string[] => ["-s", "-C", dir, script, command, E2E.LABEL, stamp];
