import { ENV } from "@allonfire/core/shared/constants/env";
import { PrismaClient } from "../../../generated/prisma/client";
import { env } from "../../environment/environment";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Dev servers reload modules; one client on globalThis keeps them from
// opening a new connection pool on every reload.
if (env.NODE_ENV !== ENV.NODE.PRODUCTION) {
  globalForPrisma.prisma = prisma;
}
