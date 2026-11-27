/** What a Release (`CONTEXT.md`) numbers, and where. */
export const RELEASE = {
  /** Files a Release reads or edits, at the repo root or in a package's folder. */
  FILE: {
    /** Every resolved dependency; Turbo reads what a change to it redeploys. */
    LOCKFILE: "pnpm-lock.yaml",
    /** A package's manifest, the only file a Release edits in it. */
    MANIFEST: "package.json",
    /** Markdown is excluded from every Turbo task's inputs. */
    MARKDOWN_EXTENSION: ".md",
    /** The repo's own number, which a Release writes first. */
    VERSION: "VERSION",
    /** Which folders hold packages. */
    WORKSPACE: "pnpm-workspace.yaml",
  },
  /** How `pnpm-workspace.yaml` lists a folder's children: `apps/*`. */
  GLOB: { CHILDREN: "/*" },
  /** The bump kinds, as `/iso-push` names them. */
  KIND: ["major", "minor", "patch"],
  /** The `pnpm-workspace.yaml` key that lists the package folders. */
  WORKSPACE_KEY: "packages",
} as const;
