import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { REPO } from "@allonfire/config/local/repo";
import { objectValues } from "../../shared/utils/object";
import {
  patchVendor,
  VENDOR_PATCHES,
  type VendorPatch,
} from "./vendor-patches";

/**
 * `pnpm --filter @allonfire/core vendor:patch [--check]`: applies every
 * `VENDOR_PATCHES` fix to the vendor file it names. `--check` lists the
 * files it would rewrite and fails, writing nothing.
 */
const {
  values: { check },
} = parseArgs({ options: { check: { type: "boolean" } } });

/** Applies `patch`; the file's name when it was not yet patched. */
const apply = async (patch: VendorPatch) => {
  const path = resolve(REPO.ROOT, patch.file);
  const source = await readFile(path, "utf8");
  const patched = patchVendor(patch, source);
  if (patched === source) {
    return [];
  }
  if (!check) {
    await writeFile(path, patched);
  }
  return [patch.file];
};

const stale = (
  await Promise.all(objectValues(VENDOR_PATCHES).map(apply))
).flat();
if (check && stale.length) {
  throw new Error(`vendor:patch would rewrite ${stale.join(", ")}`);
}
