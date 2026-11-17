import { ENV } from "@allonfire/core/shared/constants/env";
import type { PrismaClient } from "../../../generated/prisma/client";
import { env } from "../../environment/environment";
import { createPrismaClient } from "./create-client";

declare global {
  // Dev servers reload modules; one client on globalThis keeps them from
  // opening a new connection pool on every reload.
  var prismaClient: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaClient ?? createPrismaClient(env.DATABASE_URL);

if (env.NODE_ENV !== ENV.NODE.PRODUCTION) {
  globalThis.prismaClient = prisma;
}
