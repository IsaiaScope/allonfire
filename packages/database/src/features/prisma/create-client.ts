import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";
import { DATABASE } from "./constants/prisma";

/**
 * A client on `url`, through the `pg` driver Prisma 7 requires. It reads no
 * env: a test's global setup builds clients before `DATABASE_URL` is filled.
 */
export const createPrismaClient = (url: string): PrismaClient =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      connectionTimeoutMillis: DATABASE.CONNECT_TIMEOUT_MS,
    }),
  });
