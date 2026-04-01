import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "./index.js";

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

const outPath = resolve(import.meta.dirname, "../seed-data/topics.json");
writeFileSync(outPath, `${JSON.stringify(topics, null, 2)}\n`);

console.log(`Exported ${topics.length} topics to seed-data/topics.json`);
await prisma.$disconnect();
