import type { OpenApiFragment } from "@allonfire/auth/types";
import { objectFromEntries, objectKeys } from "@allonfire/utils/object";

type ComponentGroups = Record<string, Record<string, unknown>>;

type MergeableDocument = {
  paths?: Record<string, unknown>;
  components?: ComponentGroups;
  tags?: unknown[];
};

function mergeComponents(
  base: ComponentGroups,
  extra: ComponentGroups
): ComponentGroups {
  const groups = new Set([...objectKeys(base), ...objectKeys(extra)]);
  return objectFromEntries(
    [...groups].map((group) => {
      const ours = base[group] ?? {};
      const theirs = extra[group] ?? {};
      const clash = objectKeys(theirs).find((name) => name in ours);
      if (clash) {
        throw new Error(`OpenAPI component defined twice: ${group}.${clash}`);
      }
      return [group, { ...ours, ...theirs }];
    })
  );
}

/** Folds a module's fragment into the host document; the output is only serialised. */
export const mergeOpenApi = <T extends MergeableDocument>(
  base: T,
  fragment: OpenApiFragment
): T => ({
  ...base,
  components: mergeComponents(base.components ?? {}, fragment.components),
  paths: { ...base.paths, ...fragment.paths },
  tags: [...(base.tags ?? []), ...fragment.tags],
});
