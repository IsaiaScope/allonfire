import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  dropDatabase,
  liquibase,
  migrateImage,
  recreateDatabase,
  throwawayUrl,
} from "./throwaway-db";

const DOCKER_TIMEOUT = 300_000;
const DATABASE = "allonfire_backup";
const VOLUME = "allonfire-backup-test";
const KEEP = 2;
const DUMP_NAME = /^allonfire-\d{8}T\d{15}Z\.dump$/;

function docker(...args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8" });
}

/** File names in the backup volume, sorted. */
function backups(): string[] {
  return docker("run", "--rm", "-v", `${VOLUME}:/b:ro`, "alpine", "ls", "/b")
    .split("\n")
    .filter(Boolean)
    .sort();
}

function backup(url: string): string {
  return migrateImage(
    url,
    [`DB_BACKUPS_VOLUME=${VOLUME}`, `BACKUP_KEEP=${KEEP}`],
    "backup"
  );
}

describe("backup", () => {
  const url = throwawayUrl(DATABASE);

  beforeAll(async () => {
    docker("volume", "rm", "--force", VOLUME);
    await recreateDatabase(DATABASE);
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    docker("volume", "rm", "--force", VOLUME);
    await dropDatabase(DATABASE);
  });

  it(
    "keeps only the newest dumps",
    () => {
      for (let run = 0; run <= KEEP; run += 1) {
        backup(url);
      }
      const files = backups();
      expect(files).toHaveLength(KEEP);
      for (const file of files) {
        expect(file).toMatch(DUMP_NAME);
      }
    },
    DOCKER_TIMEOUT
  );

  it(
    "writes a dump pg_restore can read, with every table",
    () => {
      const newest = backups().at(-1) ?? "";
      const contents = docker(
        "run",
        "--rm",
        "-v",
        `${VOLUME}:/b:ro`,
        "postgres:16-alpine",
        "pg_restore",
        "--list",
        `/b/${newest}`
      );
      expect(contents).toContain("TABLE DATA auth User");
      expect(contents).toContain("TABLE DATA laura Photo");
    },
    DOCKER_TIMEOUT
  );

  it(
    "fails without touching the kept dumps when the database is unreachable",
    () => {
      const before = backups();
      expect(() =>
        backup(throwawayUrl("allonfire_backup_does_not_exist"))
      ).toThrow();
      expect(backups()).toEqual(before);
    },
    DOCKER_TIMEOUT
  );
});
