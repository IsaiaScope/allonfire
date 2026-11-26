import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PATTERN } from "../../shared/constants/patterns";
import { parseJsonWith } from "../../shared/utils/json";
import { changedFiles } from "./changed-files";
import { RELEASE } from "./constants/release";
import {
  bumpVersion,
  changedPackages,
  partsOf,
  releaseKind,
  setVersion,
  type WorkspacePackage,
} from "./release-versions";

const manifestSchema = z.object({
  name: z.string(),
  version: z.string(),
});

type ReleaseRequest = {
  /** The folders of the Deploy units that redeploy (`affectedSince`). */
  deployed: readonly string[];
  /** The commit the range starts at: the last Release. */
  from: string;
  next: string;
  previous: string;
  /** The checkout to edit: the repo root, or a worktree of it. */
  root: string;
};

const folders = (root: string, glob: string): string[] => {
  const base = glob.slice(0, -RELEASE.GLOB.CHILDREN.length);
  return readdirSync(join(root, base), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${base}/${entry.name}`);
};

/** The lines of `pnpm-workspace.yaml`'s `packages:` list; other keys' lists are not packages. */
const packagesLines = (root: string): string[] => {
  let key = "";
  return readFileSync(join(root, RELEASE.FILE.WORKSPACE), "utf8")
    .split("\n")
    .filter((line) => {
      key = line.match(PATTERN.RELEASE.WORKSPACE_KEY)?.[1] ?? key;
      return key === RELEASE.WORKSPACE_KEY;
    });
};

/**
 * The workspace folders: `pnpm-workspace.yaml`'s globs, minus its `!` ones.
 * Only `dir/*` and `!folder` are read; any other entry throws, since skipping
 * it would leave its packages out of the Release.
 */
const workspaceFolders = (root: string): string[] => {
  const included: string[] = [];
  const excluded = new Set<string>();
  for (const line of packagesLines(root)) {
    const [, negated, entry] =
      line.match(PATTERN.RELEASE.WORKSPACE_ENTRY) ?? [];
    if (!entry) {
      continue;
    }
    if (negated) {
      excluded.add(entry);
    } else if (entry.endsWith(RELEASE.GLOB.CHILDREN)) {
      included.push(...folders(root, entry));
    } else {
      throw new Error(
        `${RELEASE.FILE.WORKSPACE}: cannot expand the entry "${entry}"`
      );
    }
  }
  // No entry read means a list written another way: no package would move.
  if (included.length === 0) {
    throw new Error(`${RELEASE.FILE.WORKSPACE}: lists no package folder`);
  }
  return included.filter((folder) => !excluded.has(folder));
};

const manifestPath = (folder: string) => `${folder}/${RELEASE.FILE.MANIFEST}`;

const readManifest = (root: string, folder: string) => {
  try {
    return parseJsonWith(
      readFileSync(join(root, manifestPath(folder)), "utf8"),
      manifestSchema
    );
  } catch (cause) {
    throw new Error(`${manifestPath(folder)} cannot be read as a package`, {
      cause,
    });
  }
};

/**
 * Every workspace package. The whole workspace or a throw: a package left out
 * would move no version.
 *
 * @internal Exported for the versions tests.
 */
export const readWorkspace = (root: string): WorkspacePackage[] =>
  // A folder with no manifest is not a package.
  workspaceFolders(root)
    .filter((folder) => existsSync(join(root, manifestPath(folder))))
    .map((folder) => {
      const { name, version } = readManifest(root, folder);
      return { name, path: folder, version };
    });

const writeVersions = (
  root: string,
  versions: readonly { next: string; entry: WorkspacePackage }[]
): string[] =>
  versions.map(({ entry, next }) => {
    const path = manifestPath(entry.path);
    const file = join(root, path);
    writeFileSync(file, setVersion(readFileSync(file, "utf8"), next));
    return path;
  });

/**
 * The Release's package numbers: each package the range changed moves by the
 * Release's kind. Returns the manifests it wrote, from the repo root.
 */
export const applyRelease = ({
  deployed,
  from,
  next,
  previous,
  root,
}: ReleaseRequest): string[] => {
  const kind = releaseKind(previous, next);
  // No earlier Release (an empty `from`): everything in the repo is part of this one.
  const files = changedFiles(root, from);
  return writeVersions(
    root,
    changedPackages(readWorkspace(root), files, deployed).map((entry) => ({
      entry,
      next: bumpVersion(entry.version, kind),
    }))
  );
};

/** Every workspace package set to one version (the one-time alignment). */
export const alignVersions = ({
  root,
  version,
}: {
  root: string;
  version: string;
}): string[] => {
  // Throws on anything but major.minor.patch, before any file is written.
  partsOf(version);
  return writeVersions(
    root,
    readWorkspace(root)
      .filter((entry) => entry.version !== version)
      .map((entry) => ({ entry, next: version }))
  );
};
