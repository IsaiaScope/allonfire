import { z } from "zod";
import { PATTERN } from "../../shared/constants/patterns";
import { isDeployUnit } from "./affected";
import { RELEASE } from "./constants/release";

const releaseKindSchema = z.enum(RELEASE.KIND);

export type ReleaseKind = z.infer<typeof releaseKindSchema>;

/** A workspace package, as its `package.json` and place describe it. */
export type WorkspacePackage = {
  name: string;
  /** Its folder from the repo root, `packages/ui`. */
  path: string;
  version: string;
};

/** A `major.minor.patch` version's numbers; throws on anything else. */
export const partsOf = (version: string): [number, number, number] => {
  if (!PATTERN.RELEASE.VERSION.test(version)) {
    throw new Error(`"${version}" is not major.minor.patch`);
  }
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);
  return [major, minor, patch];
};

/** The version after a Release of this kind; lower parts reset to zero. */
export const bumpVersion = (current: string, kind: ReleaseKind): string => {
  const [major, minor, patch] = partsOf(current);
  if (kind === "major") {
    return `${major + 1}.0.0`;
  }
  return kind === "minor"
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;
};

/** The kind a Release was, read from the repo's version before and after. */
export const releaseKind = (previous: string, next: string): ReleaseKind => {
  const [majorBefore, minorBefore, patchBefore] = partsOf(previous);
  const [majorAfter, minorAfter, patchAfter] = partsOf(next);
  if (majorAfter !== majorBefore) {
    return "major";
  }
  if (minorAfter !== minorBefore) {
    return "minor";
  }
  if (patchAfter !== patchBefore) {
    return "patch";
  }
  throw new Error(`${previous} to ${next} moved nothing`);
};

/**
 * The manifest with its own `"version"` line set, every other byte kept: no
 * `npm version`, which rewrites the file (field order is linted).
 */
export const setVersion = (manifest: string, version: string): string => {
  if (!PATTERN.RELEASE.VERSION_LINE.test(manifest)) {
    throw new Error("the manifest has no top-level version");
  }
  return manifest.replace(PATTERN.RELEASE.VERSION_LINE, `$1${version}$2`);
};

const isSourceFile = (file: string) =>
  !file.endsWith(RELEASE.FILE.MARKDOWN_EXTENSION);

/**
 * The packages a Release numbers. A Deploy unit: one that redeploys
 * (`deployed`, its folder), so its number moves exactly when its code ships. A
 * library: one with a changed file under its folder, Markdown aside.
 */
export const changedPackages = (
  packages: readonly WorkspacePackage[],
  changedFiles: readonly string[],
  deployed: readonly string[]
): WorkspacePackage[] => {
  const files = changedFiles.filter(isSourceFile);
  return packages.filter(({ path }) =>
    isDeployUnit(path)
      ? deployed.includes(path)
      : files.some((file) => file.startsWith(`${path}/`))
  );
};
