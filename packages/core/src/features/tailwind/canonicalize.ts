import { readdir, readFile, writeFile } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from "node:path";
import { parseArgs } from "node:util";
import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { canonicalizeSource } from "./canonicalize-source";

/**
 * `pnpm --filter @allonfire/core tailwind:canonicalize --css <stylesheet>
 * --dir <folder>... [--check] [files...]`: rewrites every Tailwind class under
 * the folders to the canonical spelling the editor's `suggestCanonicalClasses`
 * asks for (`rounded-[4px]` to `rounded-lg`), judged against that stylesheet's
 * theme. An App runs it on its `src` and ui's components, against its
 * `src/app/globals.css`; `packages/shadcn` on what its CLI writes (ADR 0010).
 *
 * Files passed after the flags (the pre-commit hook's staged files) are the
 * only ones touched, and only those inside a `--dir`. `--check` lists what it
 * would rewrite and fails, writing nothing. A relative path is the repo's.
 */
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: "boolean" },
    css: { type: "string" },
    dir: { multiple: true, type: "string" },
  },
});
if (!(values.css && values.dir)) {
  throw new Error(
    "tailwind:canonicalize needs --css <stylesheet> and --dir <folder>"
  );
}
/** What the editor's `suggestCanonicalClasses` assumes, so `[16px]` reads as `4`. */
const ROOT_FONT_SIZE_PX = 16;
const SOURCE_FILE = /\.(tsx?|jsx?)$/;
const SKIPPED_DIR = new Set(["node_modules", ".next", "dist"]);
// `pnpm --filter` runs this from core's folder, so paths resolve from the repo.
const REPO_DIR = resolve(import.meta.dirname, "../../../../..");

const roots = values.dir.map((dir) => resolve(REPO_DIR, dir));

const isSource = (path: string) =>
  SOURCE_FILE.test(path) && !basename(path).startsWith("._");

const isInside = (path: string, dir: string) => {
  const rest = relative(dir, path);
  return !(rest.startsWith("..") || isAbsolute(rest));
};

/** Every source file under `dir`, skipping exFAT's `._` sidecars and build output. */
const sourcesIn = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter(({ name }) => !(name.startsWith("._") || SKIPPED_DIR.has(name)))
      .map((entry) => {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          return sourcesIn(path);
        }
        return isSource(path) ? [path] : [];
      })
  );
  return nested.flat();
};

const files =
  positionals.length > 0
    ? positionals
        .map((path) => resolve(REPO_DIR, path))
        .filter(
          (path) => isSource(path) && roots.some((root) => isInside(path, root))
        )
    : (await Promise.all(roots.map(sourcesIn))).flat();

// Loaded only when there is a file to read: most commits stage none of them.
const stylesheet = resolve(REPO_DIR, values.css);
const designSystem =
  files.length > 0
    ? await __unstable__loadDesignSystem(await readFile(stylesheet, "utf8"), {
        base: dirname(stylesheet),
      })
    : null;
const canonicalize = (candidate: string) =>
  designSystem?.canonicalizeCandidates([candidate], {
    rem: ROOT_FONT_SIZE_PX,
  })[0] ?? candidate;

const changed = (
  await Promise.all(
    files.map(async (path) => {
      const before = await readFile(path, "utf8");
      const after = canonicalizeSource(
        before,
        extname(path).slice(1),
        canonicalize
      );
      if (after === before) {
        return null;
      }
      if (!values.check) {
        await writeFile(path, after);
      }
      return relative(REPO_DIR, path);
    })
  )
).filter((path) => path !== null);

if (values.check) {
  for (const path of changed) {
    console.error(`non-canonical Tailwind classes: ${path}`);
  }
  if (changed.length > 0) {
    console.error(
      "Run `pnpm tailwind:fix` in the App to rewrite them (the editor's suggestCanonicalClasses)."
    );
    process.exitCode = 1;
  }
} else {
  for (const path of changed) {
    process.stdout.write(`canonicalized ${path}\n`);
  }
}
