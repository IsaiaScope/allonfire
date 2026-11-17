import type { DayRange } from "@allonfire/core/features/search/utc-day-range";
import { utcDayRange } from "@allonfire/core/features/search/utc-day-range";
import type { Prisma } from "../../../../generated/prisma/client";
import { type App, ImageAccess } from "../../../../generated/prisma/enums";
import { nameContains } from "./alt";

/**
 * The Images visible to someone who enters `enterable` (public, or in an App
 * they enter, ADR 0027), narrowed to those placed in `app`, in any of `apps`,
 * with any of the `accesses`, created in the `created` days (whole UTC days,
 * both ends included) and holding `text`; each narrowing given applies
 * on top of the others.
 */
export const visibleImages = ({
  accesses,
  app,
  apps,
  created,
  enterable,
  text,
}: {
  accesses?: readonly ImageAccess[] | undefined;
  app?: App | undefined;
  apps?: readonly App[] | undefined;
  created?: DayRange | undefined;
  enterable: readonly App[];
  text?: string | undefined;
}) =>
  ({
    AND: [
      ...(app ? [{ apps: { some: { app } } }] : []),
      ...(apps?.length ? [{ apps: { some: { app: { in: [...apps] } } } }] : []),
      ...(accesses?.length ? [{ access: { in: [...accesses] } }] : []),
      ...(created ? [{ createdAt: utcDayRange(created) }] : []),
      ...(text ? [nameContains(text)] : []),
      {
        OR: [
          { access: ImageAccess.PUBLIC },
          { apps: { some: { app: { in: [...enterable] } } } },
        ],
      },
    ],
  }) satisfies Prisma.ImageWhereInput;
