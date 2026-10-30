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

const REPO = resolve(import.meta.dirname, "../../../..");
const SCRIPT = resolve(REPO, "packages/config/local/env-production.sh");
const SECRET = "secret-1";

let dir: string;

/** A stub on PATH that writes its stdin to `<name>.in` and its args to `<name>.args`. */
const stub = (name: string) => {
  const path = join(dir, name);
  writeFileSync(
    path,
    `#!/bin/sh\ncat > "${path}.in"\necho "$@" > "${path}.args"\n`
  );
  chmodSync(path, 0o755);
};

const run = (...args: string[]) =>
  spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "env-production-"));
  writeFileSync(
    join(dir, ".env.production"),
    `# GitHub prod\nA="${SECRET}"\n\nEMPTY=\nB='quoted'\n`
  );
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

const file = () => join(dir, ".env.production");

describe("env-production.sh", () => {
  it("keys prints names only", () => {
    const result = run("keys", file());

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("A\nEMPTY\nB\n");
    expect(result.stdout + result.stderr).not.toContain(SECRET);
  });

  it("check names the empty keys and exits 1", () => {
    const result = run("check", file());

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("EMPTY\n");
    expect(result.stdout + result.stderr).not.toContain(SECRET);
  });

  it("check exits 0 when every key holds a value", () => {
    writeFileSync(file(), `A="${SECRET}"\n`);

    expect(run("check", file()).status).toBe(0);
  });

  it("copy puts the unquoted value on the clipboard and never echoes it", () => {
    stub("pbcopy");
    const result = run("copy", file(), "A");

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("copied A\n");
    expect(result.stderr).not.toContain(SECRET);
    expect(readFileSync(join(dir, "pbcopy.in"), "utf8")).toBe(SECRET);
  });

  it("gh-secret pipes the value to gh secret set and never echoes it", () => {
    stub("gh");
    const result = run("gh-secret", file(), "B", "prod");

    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain("quoted");
    expect(readFileSync(join(dir, "gh.in"), "utf8")).toBe("quoted");
    expect(readFileSync(join(dir, "gh.args"), "utf8")).toBe(
      "secret set B --env prod\n"
    );
  });

  it("refuses a missing or empty key without a value in its message", () => {
    stub("pbcopy");

    expect(run("copy", file(), "NOPE").status).toBe(1);
    expect(run("copy", file(), "EMPTY").status).toBe(1);
  });
});

describe(".env.production files", () => {
  const git = (...args: string[]) =>
    spawnSync("git", args, { cwd: REPO, encoding: "utf8" });

  it("none is tracked", () => {
    const tracked = git("ls-files", "*.env.production", ".env.production");

    expect(tracked.stdout).toBe("");
  });

  it.each([
    "docker/.env.production",
    "apps/api/.env.production",
    "apps/back-office/env/.env.production",
  ])("%s is ignored", (path) => {
    expect(git("check-ignore", "-q", path).status).toBe(0);
  });

  it("has no template of its own: the .env.example beside it is the shape", () => {
    expect(git("ls-files", "*.env.production.example").stdout).toBe("");
  });
});
