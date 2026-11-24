import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { REPO } from "@allonfire/config/local/repo";
import { objectValues } from "../../shared/utils/object";
import { patchVendor, VENDOR_PATCHES } from "./vendor-patches";

/**
 * `pnpm --filter @allonfire/core vendor:patch [--check]`: applies every
 * `VENDOR_PATCHES` fix to the vendor file it names. `--check` lists the
 * files it would rewrite and fails, writing nothing.
 */
const {
  values: { check },
} = parseArgs({ options: { check: { type: "boolean" } } });

const patches = objectValues(VENDOR_PATCHES);
const files = [...new Set(patches.map((patch) => patch.file))];

/** Applies every patch that names `file`, in turn, then writes it once; the file's name when it was not yet patched. */
const apply = async (file: string) => {
  const path = resolve(REPO.ROOT, file);
  const source = await readFile(path, "utf8");
  const patched = patches
    .filter((patch) => patch.file === file)
    .reduce((text, patch) => patchVendor(patch, text), source);
  if (patched === source) {
    return [];
  }
  if (!check) {
    await writeFile(path, patched);
  }
  return [file];
};

const stale = (await Promise.all(files.map(apply))).flat();
if (check && stale.length) {
  throw new Error(`vendor:patch would rewrite ${stale.join(", ")}`);
}
