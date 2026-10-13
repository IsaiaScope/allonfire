// `pnpm db:seed`: the seed on the database `.env` names.
import { seedEnv } from "../../environment/seed-environment";
import { prisma } from "../prisma/client";
import { seed } from "./seed";

try {
  await seed(prisma, seedEnv);
  console.log(`Seeded (${seedEnv.DATABASE_SEED_MODE} mode)`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
