import { Prisma } from "../../../../../generated/prisma/client";

/** Postgres' code for a foreign key that points at nothing. */
const FOREIGN_KEY_VIOLATION = "23503";

/** A statement that failed on a foreign key (a raw one reaches Prisma as `P2010` carrying Postgres' code). */
export const refusedByForeignKey = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2003" ||
    (error.code === "P2010" && error.meta?.code === FOREIGN_KEY_VIOLATION));
