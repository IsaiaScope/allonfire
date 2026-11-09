import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { E2E, e2eCliArgs } from "./run";
import { E2E_STORAGE_ENV } from "./storage-env";

const run = promisify(execFile);

/**
 * Drops the run's Test database and bucket, named by its stamp, at once. This
 * process never had the web servers' env (Turbo hands it none of the storage
 * settings, and CI has no `.env`), so the run's storage settings are passed
 * here; both drops are tried before a failure is reported.
 */
export default async function teardown(): Promise<void> {
  const stamp = process.env.CONFIG_E2E_STAMP;
  if (!stamp) {
    return;
  }
  const results = await Promise.allSettled(
    [E2E.CLI.DATABASE, E2E.CLI.BUCKET].map((cli) =>
      run("pnpm", e2eCliArgs(cli, "drop", stamp), {
        env: { ...process.env, ...E2E_STORAGE_ENV },
      })
    )
  );
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );
  if (failures.length > 0) {
    // The causes in the message: a CI log prints only that, not `errors`.
    const causes = failures.map((failure) =>
      failure instanceof Error ? failure.message : String(failure)
    );
    throw new AggregateError(
      failures,
      `e2e teardown left something behind:\n${causes.join("\n")}`
    );
  }
}
