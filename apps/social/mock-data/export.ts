import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Load DATABASE_URL before any Prisma imports
const envPath = resolve(import.meta.dirname, "../../../packages/database/.env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    continue;
  }
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) {
    continue;
  }
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
  if (!process.env[key]) {
    process.env[key] = val;
  }
}

const { prisma } = await import("@allonfire/database");

const topics = await prisma.topic.findMany({
  orderBy: { discoveredAt: "desc" },
  select: {
    title: true,
    summary: true,
    sourceUrl: true,
    sourceName: true,
    category: true,
    status: true,
    rawData: true,
  },
});

const outPath = resolve(import.meta.dirname, "topics.json");
writeFileSync(outPath, `${JSON.stringify(topics, null, 2)}\n`);

console.log(`Exported ${topics.length} topics to mock-data/topics.json`);
await prisma.$disconnect();
