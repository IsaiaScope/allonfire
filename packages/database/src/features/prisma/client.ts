import { ENV } from "@allonfire/core/shared/constants/env";
import { PrismaClient } from "../../../generated/prisma/client";
import { env } from "../../environment/environment";

declare global {
  // Dev servers reload modules; one client on globalThis keeps them from
  // opening a new connection pool on every reload.
  var prismaClient: PrismaClient | undefined;
}

export const prisma = globalThis.prismaClient ?? new PrismaClient();

if (env.NODE_ENV !== ENV.NODE.PRODUCTION) {
  globalThis.prismaClient = prisma;
}
