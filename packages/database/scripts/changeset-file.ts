export const CHANGESET_AUTHOR = "isaia";
export const CHANGESET_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Any numbered `.sql`, hand-named ones included, so none shares a number.
export const CHANGESET_FILE = /^\d{4}-.+\.sql$/;
const NUMBER_LENGTH = 4;
const SQL_COMMENT = "--";

function isStatementLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed !== "" && !trimmed.startsWith(SQL_COMMENT);
}

/** True when a `prisma migrate diff --script` output holds no statement. */
export function isEmptySql(sql: string): boolean {
  return !sql.split("\n").some(isStatementLine);
}

/** The four-digit prefix the next changeset file takes. */
export function nextChangesetNumber(fileNames: readonly string[]): string {
  const numbers = fileNames
    .filter((name) => CHANGESET_FILE.test(name))
    .map((name) => Number(name.slice(0, NUMBER_LENGTH)));
  const next = numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
  return String(next).padStart(NUMBER_LENGTH, "0");
}

/**
 * A Liquibase formatted-SQL changeset. `logicalFilePath` fixes the path
 * Liquibase records for it, so running from another directory cannot make an
 * applied changeset look new. Liquibase joins consecutive `--rollback` lines
 * into one rollback script, so every statement line of the reverse diff
 * becomes one.
 */
export function buildChangeset({
  id,
  forward,
  rollback,
}: {
  id: string;
  forward: string;
  rollback: string;
}): string {
  const rollbackLines = rollback
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(isStatementLine)
    .map((line) => `--rollback ${line}`);
  return [
    `--liquibase formatted sql logicalFilePath:changesets/${id}.sql`,
    "",
    `--changeset ${CHANGESET_AUTHOR}:${id}`,
    forward.trim(),
    ...rollbackLines,
    "",
  ].join("\n");
}
