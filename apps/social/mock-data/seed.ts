import { readFileSync } from "node:fs";
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
type TopicCategory = import("@allonfire/database").TopicCategory;
type TopicStatus = import("@allonfire/database").TopicStatus;

type MockTopic = {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  status: string;
  rawData: unknown;
};

const topics: MockTopic[] = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "topics.json"), "utf-8")
);

const mode = process.argv[2];

if (mode === "--clear") {
  await prisma.post.updateMany({
    where: { topicId: { not: null } },
    data: { topicId: null },
  });
  const { count } = await prisma.topic.deleteMany();
  console.log(`Deleted ${count} topics`);
}

const existing = await prisma.topic.count();
if (existing > 0 && mode !== "--clear") {
  console.log(
    `Database already has ${existing} topics. Use --clear to wipe first.`
  );
  await prisma.$disconnect();
  process.exit(0);
}

// Batch existence check instead of N+1 queries
const allUrls = topics.map((t) => t.sourceUrl);
const existingTopics = await prisma.topic.findMany({
  where: { sourceUrl: { in: allUrls } },
  select: { sourceUrl: true },
});
const existingUrls = new Set(existingTopics.map((t) => t.sourceUrl));

const newTopics = topics.filter((t) => !existingUrls.has(t.sourceUrl));

if (newTopics.length > 0) {
  await prisma.topic.createMany({
    data: newTopics.map((topic) => ({
      title: topic.title,
      summary: topic.summary,
      sourceUrl: topic.sourceUrl,
      sourceName: topic.sourceName,
      category: topic.category as TopicCategory,
      status: topic.status as TopicStatus,
      rawData: topic.rawData as never,
    })),
  });
}

console.log(
  `Seeded ${newTopics.length} topics (${topics.length - newTopics.length} duplicates skipped)`
);
await prisma.$disconnect();
