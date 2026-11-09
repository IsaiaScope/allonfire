import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { checkVersion } from "@allonfire/core/features/version/utils/resource-changed-error";
import { versionOf } from "@allonfire/core/features/version/utils/version-of";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import type { Prisma } from "../../../../generated/prisma/client";
import type { App, ImageAccess } from "../../../../generated/prisma/enums";
import { type ImageAlt, readAlt } from "./alt";

/** What an Image's Version covers: what a save could overwrite. */
export type VersionedImage = {
  updatedAt: Date;
  access: ImageAccess;
  alt: ImageAlt;
  apps: readonly App[];
};

/**
 * An Image's Version: its row's last change and every field a save writes.
 * `updatedAt` makes every change a new Version; the Apps are hashed too,
 * since an `ImageApp` row has no timestamp on the Image, sorted so their
 * order never counts. The alt is one part, JSON in Language order, so no
 * text can pass for another Language's.
 */
export const imageVersion = ({
  access,
  alt,
  apps,
  updatedAt,
}: VersionedImage) =>
  versionOf(
    updatedAt.toISOString(),
    access,
    stringifyJson(
      I18N.CONTENT_LANGUAGES.map((language) => alt[language] ?? null)
    ),
    ...[...apps].sort()
  );

/** An Image row as read: `alt` the stored JSON, each App a placement row. */
type ImageRowVersioned = Omit<VersionedImage, "alt" | "apps"> & {
  alt: Prisma.JsonValue;
  apps: readonly { app: App }[];
};

/** A row's Version, its `alt` read as `readAlt` reads it. */
const rowVersion = ({ access, alt, apps, updatedAt }: ImageRowVersioned) =>
  imageVersion({
    access,
    alt: readAlt(alt),
    apps: apps.map(({ app }) => app),
    updatedAt,
  });

/**
 * Throws core's `ResourceChangedError` unless each Image `opened` names is
 * still on the Version it was opened on, as its `locked` row holds it.
 */
export const checkImageVersions = (
  opened: readonly { id: string; version: string }[],
  locked: readonly (ImageRowVersioned & { id: string })[]
) => {
  const held = new Map(locked.map((row) => [row.id, rowVersion(row)]));
  for (const { id, version } of opened) {
    checkVersion(version, held.get(id) ?? "");
  }
};
