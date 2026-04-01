import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "better-auth/crypto";
import type {
  Platform,
  PostStatus,
  PostType,
  PromptRating,
  Role,
  TopicCategory,
  TopicStatus,
} from "../generated/prisma/client";
import { prisma } from "./index.js";
import { seedEnv } from "./seed-env.js";

type SeedUser = {
  email: string;
  name: string;
  role: string;
  allowedApps: string[];
};

const SEED_DATA_DIR = resolve(import.meta.dirname, "../seed-data");

function readSeedFile<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(SEED_DATA_DIR, filename), "utf-8"));
}

async function upsertUser(
  { email, name, role, allowedApps }: SeedUser,
  hashedPassword: string
) {
  const typedRole = role as Role;
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: typedRole, allowedApps },
    create: { email, name, emailVerified: true, role: typedRole, allowedApps },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashedPassword },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  }

  console.log(
    `Seeded: ${email} (role: ${role}, apps: ${allowedApps.join(", ")})`
  );
}

async function main() {
  // Always seed the main admin
  const adminName =
    seedEnv.ADMIN_NAME ?? seedEnv.ADMIN_EMAIL.split("@")[0] ?? "Admin";
  const adminHash = await hashPassword(seedEnv.ADMIN_PASSWORD);

  await upsertUser(
    {
      email: seedEnv.ADMIN_EMAIL,
      name: adminName,
      role: "ADMIN",
      allowedApps: ["all"],
    },
    adminHash
  );

  // Always seed viewer accounts (like admin, available in all modes)
  const socialViewerHash = await hashPassword(seedEnv.SOCIAL_VIEWER_PASSWORD);
  await upsertUser(
    {
      email: seedEnv.SOCIAL_VIEWER_EMAIL,
      name: seedEnv.SOCIAL_VIEWER_EMAIL.split("@")[0] ?? "social-viewer",
      role: "VIEWER",
      allowedApps: ["social"],
    },
    socialViewerHash
  );

  const lauraViewerHash = await hashPassword(seedEnv.LAURA_VIEWER_PASSWORD);
  await upsertUser(
    {
      email: seedEnv.LAURA_VIEWER_EMAIL,
      name: seedEnv.LAURA_VIEWER_EMAIL.split("@")[0] ?? "laura-viewer",
      role: "VIEWER",
      allowedApps: ["laura"],
    },
    lauraViewerHash
  );

  if (seedEnv.SEED_MODE === "dev") {
    if (!seedEnv.TEST_PASSWORD) {
      console.error("TEST_PASSWORD is required when SEED_MODE=dev");
      process.exit(1);
    }

    const testHash = await hashPassword(seedEnv.TEST_PASSWORD);
    const testUsers = readSeedFile<SeedUser[]>("users.json");

    await Promise.all(testUsers.map((user) => upsertUser(user, testHash)));

    console.log(`\nSeeded ${testUsers.length} test users`);

    await seedMockData();
  }
}

type TopicJson = {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  status: string;
  rawData: unknown;
};

type PromptJson = {
  topicRef: number;
  platform: string;
  contentTemplate: string;
  postType: string;
  rating: string | null;
  ratingNote: string | null;
};

type PostJson = {
  topicRef: number | null;
  type: string;
  platform: string;
  status: string;
  content: string;
  publishedDaysAgo?: number;
  publishedHoursAgo?: number;
  platformPostId?: string;
  errorMessage?: string;
};

async function seedMockData() {
  console.log("\nSeeding mock data...");

  // Clear existing mock data (order matters for FK constraints)
  await prisma.post.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.topic.deleteMany();

  const topicsJson = readSeedFile<TopicJson[]>("topics.json");

  const topics = await prisma.topic.createManyAndReturn({
    data: topicsJson.map((topic) => ({
      title: topic.title,
      summary: topic.summary,
      sourceUrl: topic.sourceUrl,
      sourceName: topic.sourceName,
      category: topic.category as TopicCategory,
      status: topic.status as TopicStatus,
      rawData: topic.rawData as never,
    })),
  });

  console.log(`Seeded ${topics.length} topics`);

  // Seed prompts from JSON, resolving topicRef to actual topic IDs
  const selectedTopics = topics.filter((t) => t.status === "SELECTED");
  const promptsJson = readSeedFile<PromptJson[]>("prompts.json");
  const now = new Date();

  const promptsData = promptsJson.flatMap((p) => {
    const topic = selectedTopics[p.topicRef];
    if (!topic) {
      return [];
    }

    const content = p.contentTemplate
      .replace("{title}", topic.title)
      .replace("{summarySlice}", topic.summary.slice(0, 100))
      .replace("{summarySlice80}", topic.summary.slice(0, 80));

    return [
      {
        topicId: topic.id,
        content,
        postType: p.postType as PostType,
        rating: p.rating as PromptRating | null,
        ratingNote: p.ratingNote,
        ratedAt: p.rating ? now : null,
      },
    ];
  });

  await prisma.prompt.createMany({ data: promptsData });
  console.log(`Seeded ${promptsData.length} prompts`);

  // Seed posts from JSON, resolving topicRef
  const postsJson = readSeedFile<PostJson[]>("posts.json");

  const postsData = postsJson.map((p) => {
    let publishedAt: Date | undefined;
    if (p.publishedDaysAgo) {
      publishedAt = new Date(
        now.getTime() - p.publishedDaysAgo * 24 * 60 * 60 * 1000
      );
    } else if (p.publishedHoursAgo) {
      publishedAt = new Date(
        now.getTime() - p.publishedHoursAgo * 60 * 60 * 1000
      );
    }

    return {
      topicId: p.topicRef !== null ? selectedTopics[p.topicRef]?.id : undefined,
      type: p.type as PostType,
      platform: p.platform as Platform,
      status: p.status as PostStatus,
      content: p.content,
      publishedAt,
      platformPostId: p.platformPostId,
      errorMessage: p.errorMessage,
    };
  });

  await prisma.post.createMany({ data: postsData });
  console.log(`Seeded ${postsData.length} posts`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
