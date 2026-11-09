import { parseArgs } from "node:util";
import { REPO } from "@allonfire/config/local/repo";
import { syncDesigns } from "./sync-core";

const { values } = parseArgs({
  options: { check: { type: "boolean" }, from: { type: "string" } },
});

const { changed } = syncDesigns(REPO.ROOT, {
  check: values.check,
  from: values.from,
});

for (const path of changed) {
  console.log(`${values.check ? "stale" : "synced"} ${path}`);
}
if (values.check && changed.length > 0) {
  console.log("run `pnpm design:sync` (or `/aof-design`) to regenerate");
  process.exitCode = 1;
}
