export type * from "../generated/prisma/client";
// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @allonfire/database
export { PrismaClient } from "../generated/prisma/client";
export { prisma } from "./features/prisma/client";
