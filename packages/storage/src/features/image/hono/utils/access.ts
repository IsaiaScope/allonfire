import type { App } from "@allonfire/database/enums";
import {
  type AccessUser,
  canManageEverywhere,
  canManageImage,
  canSeeImage,
  type ImageLink,
} from "@allonfire/database/features/auth/access/access";
import type {
  ImageChange,
  ImageLinksById,
} from "@allonfire/database/features/image/image.service";
import type { PatchChange } from "../constants/schemas";
import { forbidden, notFound } from "./errors";

/**
 * How the Image module authorises a write (ADR 0020). Every check over a
 * batch runs to its end before the next kind starts: 404 across the whole
 * batch first, then 403, so a refused batch never tells which ids exist.
 */

/** 404 unless the User sees every Image somewhere, and each is placed in `app` when one is named. */
const assertVisible = (
  user: AccessUser,
  links: Iterable<readonly ImageLink[]>,
  app?: App
) => {
  for (const placements of links) {
    const inApp =
      app === undefined || placements.some((link) => link.app === app);
    if (!(inApp && canSeeImage(user, placements))) {
      throw notFound();
    }
  }
};

/** 403 unless the User is an Admin in every App named. */
const assertManages = (user: AccessUser, apps: Iterable<App>) => {
  for (const app of apps) {
    if (!canManageImage(user, app)) {
      throw forbidden();
    }
  }
};

/** 403 unless the User is an Admin in every App each Image is placed in. */
const assertManagesEverywhere = (
  user: AccessUser,
  links: Iterable<readonly ImageLink[]>
) => {
  for (const placements of links) {
    if (!canManageEverywhere(user, placements)) {
      throw forbidden();
    }
  }
};

/** 403 unless the User is an Admin in every App each new Image goes to; checked before a file is read. */
export const authoriseUpload = (
  user: AccessUser,
  items: readonly { apps: readonly ImageLink[] }[]
) => {
  assertManages(
    user,
    items.flatMap(({ apps }) => apps.map(({ app }) => app))
  );
};

/**
 * A DELETE batch checked against each Image's current placements: 404 unless
 * every Image is visible (and placed in `app`, when named); then 403. Out of
 * one App, Admin there is enough, since the other Apps keep the Image; gone
 * everywhere, Admin in every App each Image is in.
 */
export const authoriseDelete = (
  user: AccessUser,
  current: ImageLinksById,
  app?: App
) => {
  assertVisible(user, current.values(), app);
  if (app) {
    assertManages(user, [app]);
  } else {
    assertManagesEverywhere(user, current.values());
  }
};

/** The new placements, `public` filled in: left out, an existing placement keeps its own and a new one starts private. */
const resolveLinks = (
  current: readonly ImageLink[],
  next: NonNullable<PatchChange["apps"]>
): ImageLink[] =>
  next.map((link) => ({
    app: link.app,
    public:
      link.public ??
      current.find(({ app }) => app === link.app)?.public ??
      false,
  }));

/** The Apps whose placement is added, removed or switched public. */
const changedApps = (
  current: readonly ImageLink[],
  next: readonly ImageLink[]
): App[] => {
  const before = new Map(current.map((link) => [link.app, link.public]));
  const after = new Map(next.map((link) => [link.app, link.public]));
  return [...new Set([...before.keys(), ...after.keys()])].filter(
    (app) => before.get(app) !== after.get(app)
  );
};

/**
 * A PATCH batch checked against each Image's current placements, and
 * resolved: 404 unless every Image is visible; then 403 unless the User is
 * an Admin in every App whose placement changes and, for `alt` (every App
 * shows it), in every App the Image is in now.
 */
export const authorisePatch = (
  user: AccessUser,
  current: ReadonlyMap<string, readonly ImageLink[]>,
  changes: readonly PatchChange[]
): ImageChange[] => {
  assertVisible(user, current.values());
  return changes.map(({ alt, apps, id }) => {
    const links = current.get(id) ?? [];
    const next = apps && resolveLinks(links, apps);
    const changed = next ? changedApps(links, next) : [];
    assertManages(user, changed);
    if (alt && !canManageEverywhere(user, links)) {
      throw forbidden();
    }
    // Only what changes is written: a placement added since the read stays.
    const place = next?.filter(({ app }) => changed.includes(app)) ?? [];
    const remove = changed.filter(
      (app) => !next?.some((link) => link.app === app)
    );
    return {
      id,
      ...(alt && { alt }),
      ...(place.length > 0 && { place }),
      ...(remove.length > 0 && { remove }),
    };
  });
};
