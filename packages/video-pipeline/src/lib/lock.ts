import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { LockHeldError } from "../errors";
import { lockPath } from "./paths";

type LockFile = { pid: number; at: string };

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(folder: string): void {
  const path = lockPath(folder);
  if (existsSync(path)) {
    const holder = JSON.parse(readFileSync(path, "utf-8")) as LockFile;
    if (holder.pid !== process.pid && isPidAlive(holder.pid)) {
      throw new LockHeldError(folder, holder.pid);
    }
  }
  const payload: LockFile = { pid: process.pid, at: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(payload));
}

export function releaseLock(folder: string): void {
  const path = lockPath(folder);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export async function withLock<T>(
  folder: string,
  fn: () => T | Promise<T>
): Promise<T> {
  acquireLock(folder);
  const cleanup = () => {
    releaseLock(folder);
  };
  const onSigint = () => {
    cleanup();
    process.exit(130);
  };
  process.once("SIGINT", onSigint);
  try {
    return await fn();
  } finally {
    process.removeListener("SIGINT", onSigint);
    cleanup();
  }
}
