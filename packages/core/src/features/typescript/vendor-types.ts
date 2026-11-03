import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { writeDeclarations } from "./declarations";

/**
 * `pnpm --filter @allonfire/core vendor:types --project <tsconfig>...`:
 * writes the `.d.ts` of each file a lenient vendor tsconfig names, beside it
 * (`writeDeclarations`), so its importers read the declaration and stay
 * strict (ADR 0010). A relative path is the repo's.
 */
const { values } = parseArgs({
  options: { project: { multiple: true, type: "string" } },
});
if (!values.project) {
  throw new Error("vendor:types needs --project <tsconfig>");
}
// `pnpm --filter` runs this from core's folder, so paths resolve from the repo.
const REPO_DIR = resolve(import.meta.dirname, "../../../../..");

for (const project of values.project) {
  writeDeclarations(resolve(REPO_DIR, project));
}
