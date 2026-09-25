# shadcn components stay as generated; AOF components sit on top

The old `packages/ui` held shadcn components that had been copied and then edited
by hand, so no one could tell upstream code from ours, and updating shadcn meant
re-applying every edit blind. The Design system is now two packages:
`@allonfire/shadcn`, written only by the shadcn CLI (Base UI primitives, every
registry component) and never edited by hand, and `@allonfire/ui`, which holds
AOF components composed from it plus one Theme per App. Apps import AOF
components only; a Biome rule rejects `@allonfire/shadcn` imports under `apps/`,
so a customisation always has a named home and a shadcn update is a clean diff.

## Considered Options

- **shadcn as a folder inside `@allonfire/ui`**: fewer packages, but "never edit
  this folder" is a convention a formatter or an agent breaks silently. The
  package boundary makes the rule visible and lets Biome skip the whole package.
- **shadcn components inside each App**: the CLI's default, but nothing is shared
  across Apps.
- **Apps importing shadcn components directly** where no customisation exists:
  saves thin wrappers, but every later customisation would mean hunting imports
  across Apps.

## Consequences

- The old package moved to `packages/ui-old`, untracked and outside the
  workspace, kept only as reference (the same treatment `auth-old` got).
- Laura imported the old package in 56 files, so it is paused: out of the pnpm
  workspace, turbo and the pre-commit gate until it is migrated. Its Docker build
  (`docker:build:laura`, `docker-compose.prod.yml`) does not work until then.
- Wrapping a shadcn component with no changes is expected, not waste: it is the
  place the next customisation lands.
