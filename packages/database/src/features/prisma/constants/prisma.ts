import { UNIT } from "@allonfire/core/shared/constants/units";

/** The Prisma client's own values. */
export const DATABASE = {
  TIMEOUT: {
    /**
     * How long a client waits to connect. Prisma 6 waited 5 s on its own; the
     * `pg` driver Prisma 7 uses waits for ever unless told.
     */
    CONNECT_MS: 5 * UNIT.MS_PER_SECOND,
  },
} as const;
