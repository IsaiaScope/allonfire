import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LOCAL } from "../../local/addresses";
import { E2E, e2eCliArgs } from "./run";

const run = promisify(execFile);

/**
 * Drops the run's Test database and bucket, named by its stamp, at once. This
 * process never had the web servers' env, so MinIO's address is passed here;
 * both drops are tried before a failure is reported.
 */
export default async function teardown(): Promise<void> {
  const stamp = process.env.CONFIG_E2E_STAMP;
  if (!stamp) {
    return;
  }
  const results = await Promise.allSettled(
    [E2E.CLI.DATABASE, E2E.CLI.BUCKET].map((cli) =>
      run("pnpm", e2eCliArgs(cli, "drop", stamp), {
        env: { ...process.env, STORAGE_ENDPOINT: LOCAL.URL.STORAGE },
      })
    )
  );
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, "e2e teardown left something behind");
  }
}
