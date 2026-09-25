import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// A config file turns off Prisma's own `.env` loading, so load it here. CI has
// no `.env`: its DATABASE_URL comes from the job, and a variable already set
// wins over the file.
if (existsSync(".env")) {
  process.loadEnvFile();
}

export default defineConfig({ schema: "prisma/schema" });
