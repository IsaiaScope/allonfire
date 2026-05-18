import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LockHeldError } from "../errors";
import { acquireLock, releaseLock, withLock } from "./lock";
import { lockPath } from "./paths";

let folder: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-lock-"));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("lock", () => {
  it("creates a .lock file with current pid", () => {
    acquireLock(folder);
    const content = readFileSync(lockPath(folder), "utf-8");
    expect(JSON.parse(content)).toMatchObject({ pid: process.pid });
    releaseLock(folder);
  });

  it("releaseLock removes the file", () => {
    acquireLock(folder);
    releaseLock(folder);
    expect(existsSync(lockPath(folder))).toBe(false);
  });

  it("throws LockHeldError when already locked by another live pid", () => {
    const child = spawn("node", ["-e", "setInterval(() => {}, 60000)"], {
      detached: false,
      stdio: "ignore",
    });
    try {
      writeFileSync(
        lockPath(folder),
        JSON.stringify({ pid: child.pid, at: new Date().toISOString() })
      );
      expect(() => acquireLock(folder)).toThrow(LockHeldError);
    } finally {
      child.kill();
    }
  });

  it("steals stale lock when holder pid is dead", () => {
    writeFileSync(
      lockPath(folder),
      JSON.stringify({ pid: 999_999, at: new Date().toISOString() })
    );
    acquireLock(folder);
    const content = readFileSync(lockPath(folder), "utf-8");
    expect(JSON.parse(content).pid).toBe(process.pid);
    releaseLock(folder);
  });

  it("withLock acquires, runs callback, releases — even on throw", async () => {
    await expect(
      withLock(folder, () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(existsSync(lockPath(folder))).toBe(false);
  });
});
