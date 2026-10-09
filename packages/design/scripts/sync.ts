import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { syncDesigns } from "./sync-core";

// packages/design/scripts/ -> repo root, whatever directory pnpm runs from.
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const { values } = parseArgs({
  options: { check: { type: "boolean" }, from: { type: "string" } },
});

const { changed } = syncDesigns(ROOT, {
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
