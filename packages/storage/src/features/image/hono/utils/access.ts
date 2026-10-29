import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import {
  type AccessUser,
  canManageEverywhere,
  canManageImage,
  canSeeImage,
  type ImageVisibility,
} from "@allonfire/database/features/auth/access/access";
import type {
  ImageChange,
  ImageLinksById,
} from "@allonfire/database/features/image/image.service";
import type { PatchChange } from "../constants/schemas";
import { forbidden, imageChanged, notFound } from "./errors";

/**
 * How the Image module authorises a write (ADR 0020). Every check over a
 * batch runs to its end before the next kind starts: 404 across the whole
 * batch first, then 403, so a refused batch never tells which ids exist.
 */

/** 404 unless the User sees every Image somewhere, and each is placed in `app` when one is named. */
const assertVisible = (
  user: AccessUser,
  images: Iterable<ImageVisibility>,
  app?: App
) => {
  for (const image of images) {
    const inApp = app === undefined || image.apps.includes(app);
    if (!(inApp && canSeeImage(user, image))) {
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
  images: Iterable<ImageVisibility>
) => {
  for (const { apps } of images) {
    if (!canManageEverywhere(user, apps)) {
      throw forbidden();
    }
  }
};

/**
 * 403 unless the User is an Admin in some App. Nobody else adds an Image, so
 * the upload is refused before its body (up to `IMAGE.LIMIT.UPLOAD_BYTES`) is
 * read into memory.
 */
export const authoriseUploader = (user: AccessUser) => {
  if (!objectValues(App).some((app) => canManageImage(user, app))) {
    throw forbidden();
  }
};

/** 403 unless the User is an Admin in every App each new Image goes to; checked before a file is read. */
export const authoriseUpload = (
  user: AccessUser,
  items: readonly { apps: readonly App[] }[]
) => {
  assertManages(
    user,
    items.flatMap(({ apps }) => apps)
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

/**
 * The new file a public Image turning private moves to. Public when the
 * copies were made would have one: none means another request made it public
 * since, and turning it private in place would keep its links alive (409).
 */
const renamedKey = (renamed: ReadonlyMap<string, string>, id: string) => {
  const key = renamed.get(id);
  if (!key) {
    throw imageChanged();
  }
  return key;
};

/**
 * A PATCH batch checked against each Image's current access and Apps, and
 * resolved: 404 unless every Image is visible; then 403 unless the User is an
 * Admin in every App placed or taken out and, for `alt` or `access` (every
 * App shows them), in every App the Image is in now. `renamed` holds a new
 * file name, already copied, for each Image that may turn private: used only
 * when it really goes from public to private (ADR 0027).
 */
export const authorisePatch = (
  user: AccessUser,
  current: ImageLinksById,
  changes: readonly PatchChange[],
  renamed: ReadonlyMap<string, string> = new Map()
): ImageChange[] => {
  assertVisible(user, current.values());
  return changes.map(({ access, alt, apps, id }) => {
    const image = current.get(id) ?? { access: ImageAccess.PRIVATE, apps: [] };
    // Only what changes is written, and checked.
    const place = apps?.filter((app) => !image.apps.includes(app)) ?? [];
    const remove = apps ? image.apps.filter((app) => !apps.includes(app)) : [];
    assertManages(user, [...place, ...remove]);
    const newAccess = access && access !== image.access ? access : undefined;
    if ((alt || newAccess) && !canManageEverywhere(user, image.apps)) {
      throw forbidden();
    }
    const key =
      newAccess === ImageAccess.PRIVATE ? renamedKey(renamed, id) : undefined;
    return {
      id,
      ...(alt && { alt }),
      ...(newAccess && { access: newAccess }),
      ...(key && { key }),
      ...(place.length > 0 && { place }),
      ...(remove.length > 0 && { remove }),
    };
  });
};
