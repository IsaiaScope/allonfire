import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// A config file turns off Prisma's own `.env` loading, so load it here. CI has
// no `.env`: its DATABASE_URL comes from the job, and a variable already set
// wins over the file.
if (existsSync(".env")) {
  process.loadEnvFile();
}

// Prisma 7 reads the database URL here, not from the schema's datasource. An
// unset one reads as "": `prisma generate` and knip load this file without a
// database, and a command that connects fails on the empty URL by itself
// (Prisma's `env()` would throw at load instead).
export default defineConfig({
  datasource: { url: process.env.DATABASE_URL ?? "" },
  schema: "prisma/schema",
});
