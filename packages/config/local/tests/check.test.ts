// @module-tag unit

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { REPO } from "../repo";

// A fake `pnpm` records what the script hands it; the real check is
// a Stage run, tested in stages/tests.
const CHECK = resolve(REPO.ROOT, "packages/config/local/check.sh");
const OFF_NOTICE = "Turbo remote cache is off:";

const sandbox = mkdtempSync(join(tmpdir(), "check-sh-"));
const LOG = join(sandbox, "pnpm.log");
writeFileSync(
  join(sandbox, "pnpm"),
  `#!/bin/sh
{ echo "$TURBO_SCM_BASE"; echo "$TURBO_TOKEN"; echo "$TURBO_TEAM"; echo "$*"; } > "$FAKE_PNPM_LOG"
exit "\${FAKE_PNPM_EXIT:-0}"
`
);
chmodSync(join(sandbox, "pnpm"), 0o755);

afterAll(() => {
  rmSync(sandbox, { force: true, recursive: true });
});

/** Runs check.sh with no TURBO_* of its own, `file` as its env file and `env` added. */
const runCheck = (file: string | null, env: Record<string, string> = {}) => {
  const result = spawnSync("bash", [CHECK, ...(file ? [file] : [])], {
    cwd: REPO.ROOT,
    encoding: "utf8",
    env: {
      FAKE_PNPM_LOG: LOG,
      HOME: process.env.HOME ?? "",
      PATH: `${sandbox}:${process.env.PATH}`,
      ...env,
    },
  });
  const [base, token, team, args] = readFileSync(LOG, "utf8").split("\n");
  return {
    args,
    base,
    status: result.status,
    stderr: result.stderr,
    team,
    token,
  };
};

const envFile = (name: string, text: string) => {
  const path = join(sandbox, name);
  writeFileSync(path, text);
  return path;
};

describe("local/check.sh", () => {
  it("runs pnpm check --affected from HEAD", () => {
    const { args, base, status } = runCheck(envFile("a.env", ""));
    expect(args).toBe("check --affected");
    expect(base).toBe("HEAD");
    expect(status).toBe(0);
  });

  it("hands pnpm the token and team from the file", () => {
    const { stderr, team, token } = runCheck(
      envFile("b.env", "TURBO_TEAM=example-team\nTURBO_TOKEN=secret\n")
    );
    expect(token).toBe("secret");
    expect(team).toBe("example-team");
    expect(stderr).not.toContain(OFF_NOTICE);
  });

  it("keeps a token with $, & and = whole", () => {
    const { token } = runCheck(
      envFile("c.env", "TURBO_TEAM=t\nTURBO_TOKEN=a$b&c=d\n")
    );
    expect(token).toBe("a$b&c=d");
  });

  it("prefers values already in the environment", () => {
    const { team, token } = runCheck(
      envFile("d.env", "TURBO_TEAM=file\nTURBO_TOKEN=file\n"),
      { TURBO_TEAM: "env", TURBO_TOKEN: "env" }
    );
    expect(token).toBe("env");
    expect(team).toBe("env");
  });

  it("says the cache is off and still runs when a key is missing", () => {
    const { args, status, stderr } = runCheck(
      envFile("e.env", "TURBO_TEAM=only-the-team\n")
    );
    expect(stderr).toContain(OFF_NOTICE);
    expect(stderr).toContain("TURBO_TOKEN");
    expect(stderr).toContain("TURBO_TEAM");
    expect(args).toBe("check --affected");
    expect(status).toBe(0);
  });

  it("says the cache is off when there is no env file", () => {
    const { status, stderr } = runCheck(join(sandbox, "missing.env"));
    expect(stderr).toContain(OFF_NOTICE);
    expect(status).toBe(0);
  });

  it("exits with the check's status, so the hook still blocks a commit", () => {
    const { status } = runCheck(envFile("f.env", ""), { FAKE_PNPM_EXIT: "1" });
    expect(status).toBe(1);
  });

  it("keeps .env out of git and .env.example in", () => {
    const ignored = (path: string) =>
      spawnSync("git", ["check-ignore", "-q", path], { cwd: REPO.ROOT }).status;
    expect(ignored(".env")).toBe(0);
    expect(ignored(".env.example")).toBe(1);
  });
});
