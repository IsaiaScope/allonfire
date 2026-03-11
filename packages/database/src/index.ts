import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type * from "../generated/prisma/client";
// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @allonfire/database
export { PrismaClient } from "../generated/prisma/client";
export * from "./services/index";
