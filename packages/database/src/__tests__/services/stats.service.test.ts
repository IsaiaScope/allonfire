import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../index";
import { getDailySummary, getTopicStats } from "../../services/stats.service";
import {
  canConnectToDb,
  cleanupTestData,
  disconnectTestDb,
  TEST_CONTENT_PREFIX,
  TEST_URL_PREFIX,
} from "../helpers/db-setup";

const dbAvailable = await canConnectToDb();

describe.skipIf(!dbAvailable)("stats.service", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  it("getTopicStats counts include seeded test data", async () => {
    const topics = [
      { status: "DISCOVERED" as const, category: "NEWS" as const },
      { status: "DISCOVERED" as const, category: "LEARNING" as const },
      { status: "AI_PICKED" as const, category: "NEWS" as const },
      { status: "AI_PICKED" as const, category: "TOOL_RELEASE" as const },
      { status: "AI_PICKED" as const, category: "AI_UPDATE" as const },
      { status: "SELECTED" as const, category: "NEWS" as const },
    ];

    for (const [i, t] of topics.entries()) {
      const topic = await prisma.topic.create({
        data: {
          title: `${TEST_CONTENT_PREFIX}Stats Topic ${i}`,
          summary: `Summary ${i}`,
          sourceUrl: `${TEST_URL_PREFIX}stats-${i}`,
          sourceName: "Test",
          category: t.category,
          status: t.status,
        },
      });

      if (t.status === "SELECTED") {
        await prisma.prompt.create({
          data: {
            topicId: topic.id,
            content: "Positive prompt",
            rating: "POSITIVE",
            ratingNote: "Great!",
            ratedAt: new Date(),
          },
        });
        await prisma.prompt.create({
          data: {
            topicId: topic.id,
            content: "Negative prompt",
            rating: "NEGATIVE",
            ratedAt: new Date(),
          },
        });
      }
    }

    const stats = await getTopicStats();
    // Stats count ALL data (test + real), so use greaterThanOrEqual
    expect(stats.totalCount).toBeGreaterThanOrEqual(6);
    expect(stats.discoveredCount).toBeGreaterThanOrEqual(2);
    expect(stats.aiPickedCount).toBeGreaterThanOrEqual(3);
    expect(stats.selectedCount).toBeGreaterThanOrEqual(1);
    expect(stats.promptCount).toBeGreaterThanOrEqual(2);
    expect(stats.positivePromptCount).toBeGreaterThanOrEqual(1);
    expect(stats.negativePromptCount).toBeGreaterThanOrEqual(1);
    expect(stats.notesCount).toBeGreaterThanOrEqual(1);
  });

  it("getDailySummary counts today's records", async () => {
    await cleanupTestData();

    // Create a topic with discoveredAt in the past (won't count)
    await prisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Old Topic`,
        summary: "Discovered in the past",
        sourceUrl: `${TEST_URL_PREFIX}old-stats`,
        sourceName: "Test",
        category: "NEWS",
        discoveredAt: new Date("2024-01-01"),
      },
    });

    // Create today's data
    await prisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Today Topic`,
        summary: "Discovered today",
        sourceUrl: `${TEST_URL_PREFIX}today-stats`,
        sourceName: "Test",
        category: "NEWS",
      },
    });
    await prisma.post.create({
      data: {
        type: "NEWS",
        platform: "TWITTER",
        content: `${TEST_CONTENT_PREFIX}today post`,
        publishedAt: new Date(),
      },
    });

    const summary = await getDailySummary();
    // Counts ALL today's records (test + real), so use greaterThanOrEqual
    expect(summary.newTopics).toBeGreaterThanOrEqual(1);
    expect(summary.generatedPosts).toBeGreaterThanOrEqual(1);
    expect(summary.publishedToday).toBeGreaterThanOrEqual(1);
  });
});
