import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { canonicalizeSource } from "./canonicalize-source";

/**
 * `pnpm canonicalize`: run after every `shadcn add` (ADR 0010). The CLI writes
 * classes like `rounded-[4px]`; this rewrites them to the canonical ones the
 * editor suggests, against this package's own theme, so the package stays
 * machine-written: CLI then canonicalize always gives the same files.
 */
const PACKAGE_DIR = resolve(import.meta.dirname, "..");
const STYLESHEET = join(PACKAGE_DIR, "src/styles/globals.css");
const SOURCES = ["src/components", "src/hooks", "src/lib"];
/** What the editor's `suggestCanonicalClasses` assumes, so `[16px]` reads as `4`. */
const ROOT_FONT_SIZE_PX = 16;

const designSystem = await __unstable__loadDesignSystem(
  await readFile(STYLESHEET, "utf8"),
  { base: dirname(STYLESHEET) }
);
const canonicalize = (candidate: string) =>
  designSystem.canonicalizeCandidates([candidate], {
    rem: ROOT_FONT_SIZE_PX,
  })[0] ?? candidate;

const paths = (
  await Promise.all(
    SOURCES.map(async (dir) =>
      (
        await readdir(join(PACKAGE_DIR, dir))
      )
        .filter((name) => !name.startsWith("._"))
        .map((name) => join(PACKAGE_DIR, dir, name))
    )
  )
).flat();

const changed = (
  await Promise.all(
    paths.map(async (path) => {
      const before = await readFile(path, "utf8");
      const after = canonicalizeSource(
        before,
        extname(path).slice(1),
        canonicalize
      );
      if (after === before) {
        return null;
      }
      await writeFile(path, after);
      return relative(PACKAGE_DIR, path);
    })
  )
).filter((path) => path !== null);

for (const path of changed) {
  console.log(`canonicalized ${path}`);
}
console.log(`${changed.length} file(s) changed`);
