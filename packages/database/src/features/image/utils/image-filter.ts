import type { Prisma } from "../../../../generated/prisma/client";
import { type App, ImageAccess } from "../../../../generated/prisma/enums";
import { nameContains } from "./alt";

/**
 * The Images visible to someone who enters `enterable` (public, or in an App
 * they enter, ADR 0027), narrowed to those placed in `app`, in any of `apps`,
 * with any of the `accesses` and holding `text`; each narrowing given applies
 * on top of the others.
 */
export const visibleImages = ({
  accesses,
  app,
  apps,
  enterable,
  text,
}: {
  accesses?: readonly ImageAccess[] | undefined;
  app?: App | undefined;
  apps?: readonly App[] | undefined;
  enterable: readonly App[];
  text?: string | undefined;
}) =>
  ({
    AND: [
      ...(app ? [{ apps: { some: { app } } }] : []),
      ...(apps?.length ? [{ apps: { some: { app: { in: [...apps] } } } }] : []),
      ...(accesses?.length ? [{ access: { in: [...accesses] } }] : []),
      ...(text ? [nameContains(text)] : []),
      {
        OR: [
          { access: ImageAccess.PUBLIC },
          { apps: { some: { app: { in: [...enterable] } } } },
        ],
      },
    ],
  }) satisfies Prisma.ImageWhereInput;
