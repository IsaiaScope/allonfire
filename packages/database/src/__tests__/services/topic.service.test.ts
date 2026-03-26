import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../index";
import { createPrompt, ratePrompt } from "../../services/prompt.service";
import {
  deleteAllTopics,
  deleteSelectedTopics,
  deleteTopic,
  getDiscoveredTopics,
  getDiscoveredTopicsPaginated,
  getSelectedTopicsPaginated,
  getTopicsByStatus,
  getTopicWithPrompts,
  ingestTopics,
  selectTopic,
  selectTopics,
} from "../../services/topic.service";
import {
  canConnectToDb,
  cleanupTestData,
  disconnectTestDb,
  TEST_CONTENT_PREFIX,
  TEST_URL_PREFIX,
} from "../helpers/db-setup";
import { INGEST_TOPICS, TEST_TOPICS } from "../helpers/fixtures";

const dbAvailable = await canConnectToDb();

const BASE_TIME = new Date("2025-01-01T00:00:00Z").getTime();

async function seedTestTopics() {
  await prisma.topic.createMany({
    data: TEST_TOPICS.map((topic, i) => ({
      title: topic.title,
      summary: topic.summary,
      sourceUrl: topic.sourceUrl,
      sourceName: topic.sourceName,
      category: topic.category,
      status: topic.status,
      rawData: topic.rawData as never,
      discoveredAt: new Date(BASE_TIME + i * 1000),
    })),
  });
}

describe.skipIf(!dbAvailable)("topic.service — ingest", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("ingests new topics and returns created records", async () => {
    const result = await ingestTopics(INGEST_TOPICS);
    expect(result).toHaveLength(INGEST_TOPICS.length);
    for (const topic of result) {
      expect(topic.id).toBeDefined();
      expect(topic.status).toBe("DISCOVERED");
    }
  });

  it("skips duplicate topics with same sourceUrl", async () => {
    const result = await ingestTopics(INGEST_TOPICS);
    expect(result).toHaveLength(0);
  });

  it("handles mixed new and duplicate batch", async () => {
    const mixed = [
      ...INGEST_TOPICS.slice(0, 2),
      {
        title: `${TEST_CONTENT_PREFIX}Brand New Topic`,
        summary: "A completely new topic for testing",
        sourceUrl: `${TEST_URL_PREFIX}brand-new-unique`,
        sourceName: "Test Suite",
        category: "NEWS" as const,
      },
    ];
    const result = await ingestTopics(mixed);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toContain("Brand New Topic");
  });

  it("returns empty array when all are duplicates", async () => {
    const result = await ingestTopics(INGEST_TOPICS.slice(0, 1));
    expect(result).toHaveLength(0);
  });
});

describe.skipIf(!dbAvailable)("topic.service — read & paginate", () => {
  beforeAll(async () => {
    await cleanupTestData();
    await seedTestTopics();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("getDiscoveredTopics returns only DISCOVERED status", async () => {
    const topics = await getDiscoveredTopics();
    const testTopics = topics.filter((t) =>
      t.sourceUrl.startsWith(TEST_URL_PREFIX)
    );
    expect(testTopics.length).toBeGreaterThan(0);
    for (const t of testTopics) {
      expect(t.status).toBe("DISCOVERED");
    }
  });

  it("getDiscoveredTopicsPaginated — first page returns totalCount", async () => {
    const result = await getDiscoveredTopicsPaginated({
      limit: 3,
      search: TEST_CONTENT_PREFIX,
    });
    expect(result.totalCount).toBe(5);
    expect(result.topics).toHaveLength(3);
    expect(result.nextCursor).not.toBeNull();
  });

  it("getDiscoveredTopicsPaginated — second page uses cursor", async () => {
    const first = await getDiscoveredTopicsPaginated({
      limit: 3,
      search: TEST_CONTENT_PREFIX,
    });
    const second = await getDiscoveredTopicsPaginated({
      limit: 3,
      cursor: first.nextCursor ?? undefined,
      search: TEST_CONTENT_PREFIX,
    });
    expect(second.topics).toHaveLength(2);
    expect(second.totalCount).toBeNull();
    const firstIds = new Set(first.topics.map((t) => t.id));
    for (const t of second.topics) {
      expect(firstIds.has(t.id)).toBe(false);
    }
  });

  it("getDiscoveredTopicsPaginated — category filter", async () => {
    const result = await getDiscoveredTopicsPaginated({
      category: "NEWS",
      search: TEST_CONTENT_PREFIX,
    });
    for (const t of result.topics) {
      expect(t.category).toBe("NEWS");
    }
  });

  it("getDiscoveredTopicsPaginated — search filters by title", async () => {
    const result = await getDiscoveredTopicsPaginated({
      search: `${TEST_CONTENT_PREFIX}Nvidia greenboost`,
    });
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]?.title).toContain("greenboost");
  });

  it("getDiscoveredTopicsPaginated — sort by oldest", async () => {
    const result = await getDiscoveredTopicsPaginated({
      sort: "oldest",
      limit: 50,
      search: TEST_CONTENT_PREFIX,
    });
    for (let i = 1; i < result.topics.length; i++) {
      const prev = new Date(result.topics[i - 1]?.discoveredAt ?? 0).getTime();
      const curr = new Date(result.topics[i]?.discoveredAt ?? 0).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("getTopicsByStatus returns matching statuses", async () => {
    const topics = await getTopicsByStatus(["DISCOVERED", "AI_PICKED"]);
    const testTopics = topics.filter((t) =>
      t.sourceUrl.startsWith(TEST_URL_PREFIX)
    );
    for (const t of testTopics) {
      expect(["DISCOVERED", "AI_PICKED"]).toContain(t.status);
    }
  });

  it("getTopicWithPrompts includes prompts", async () => {
    const testTopic = await prisma.topic.findFirst({
      where: { sourceUrl: { startsWith: TEST_URL_PREFIX } },
    });
    const topicId = testTopic?.id ?? "";
    expect(topicId).not.toBe("");

    await createPrompt(topicId, `${TEST_CONTENT_PREFIX}prompt content`, "NEWS");

    const result = await getTopicWithPrompts(topicId);
    expect(result).not.toBeNull();
    expect(result?.prompts).toHaveLength(1);
    expect(result?.prompts[0]?.content).toContain("prompt content");
  });
});

describe.skipIf(!dbAvailable)("topic.service — update", () => {
  beforeAll(async () => {
    await cleanupTestData();
    await seedTestTopics();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("selectTopic transitions status to SELECTED", async () => {
    const discovered = await prisma.topic.findFirst({
      where: {
        status: "DISCOVERED",
        sourceUrl: { startsWith: TEST_URL_PREFIX },
      },
    });
    expect(discovered).not.toBeNull();

    const updated = await selectTopic(discovered?.id ?? "");
    expect(updated.status).toBe("SELECTED");
  });

  it("selectTopics bulk-transitions multiple topics", async () => {
    const aiPicked = await prisma.topic.findMany({
      where: {
        status: "AI_PICKED",
        sourceUrl: { startsWith: TEST_URL_PREFIX },
      },
      take: 2,
    });
    expect(aiPicked.length).toBeGreaterThanOrEqual(2);

    const ids = aiPicked.map((t) => t.id);
    const result = await selectTopics(ids);
    expect(result.count).toBe(2);

    const verified = await prisma.topic.findMany({
      where: { id: { in: ids } },
    });
    for (const t of verified) {
      expect(t.status).toBe("SELECTED");
    }
  });
});

describe.skipIf(!dbAvailable)("topic.service — delete", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("deleteTopic removes topic and nullifies linked posts", async () => {
    const topic = await prisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Topic with post`,
        summary: "To test cascading delete",
        sourceUrl: `${TEST_URL_PREFIX}delete-cascade`,
        sourceName: "Test",
        category: "NEWS",
      },
    });

    await prisma.post.create({
      data: {
        topicId: topic.id,
        type: "NEWS",
        platform: "TWITTER",
        content: `${TEST_CONTENT_PREFIX}post for deletion`,
      },
    });

    await deleteTopic(topic.id);

    const deleted = await prisma.topic.findUnique({
      where: { id: topic.id },
    });
    expect(deleted).toBeNull();

    const post = await prisma.post.findFirst({
      where: { content: `${TEST_CONTENT_PREFIX}post for deletion` },
    });
    expect(post).not.toBeNull();
    expect(post?.topicId).toBeNull();

    // Clean up orphan post
    if (post) {
      await prisma.post.delete({ where: { id: post.id } });
    }
  });

  it("deleteAllTopics with category filter", async () => {
    await cleanupTestData();
    await seedTestTopics();

    const newsCount = TEST_TOPICS.filter((t) => t.category === "NEWS").length;
    const deleted = await deleteAllTopics("NEWS");
    // May delete more than test data if real NEWS topics exist — check at least test count
    expect(deleted).toBeGreaterThanOrEqual(newsCount);

    const remaining = await prisma.topic.findMany({
      where: {
        category: "NEWS",
        sourceUrl: { startsWith: TEST_URL_PREFIX },
      },
    });
    expect(remaining).toHaveLength(0);
  });

  it("deleteAllTopics with status filter", async () => {
    const aiPickedCount = await prisma.topic.count({
      where: {
        status: "AI_PICKED",
        sourceUrl: { startsWith: TEST_URL_PREFIX },
      },
    });
    const deleted = await deleteAllTopics(undefined, "AI_PICKED");
    expect(deleted).toBeGreaterThanOrEqual(aiPickedCount);
  });

  it("deleteSelectedTopics with rating filter", async () => {
    await cleanupTestData();
    const topic = await prisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Rated Topic`,
        summary: "A topic with a rated prompt",
        sourceUrl: `${TEST_URL_PREFIX}rated`,
        sourceName: "Test",
        category: "NEWS",
        status: "SELECTED",
      },
    });
    const prompt = await createPrompt(topic.id, "Rated prompt", "NEWS");
    await ratePrompt(prompt.id, "POSITIVE", "Great!");

    const deleted = await deleteSelectedTopics({ rating: "POSITIVE" });
    expect(deleted).toBeGreaterThanOrEqual(1);

    const remaining = await prisma.topic.findUnique({
      where: { id: topic.id },
    });
    expect(remaining).toBeNull();
  });
});

describe.skipIf(!dbAvailable)(
  "topic.service — selected topics pagination",
  () => {
    beforeAll(async () => {
      await cleanupTestData();
      for (let i = 0; i < 5; i++) {
        const topic = await prisma.topic.create({
          data: {
            title: `${TEST_CONTENT_PREFIX}Selected Topic ${i}`,
            summary: `Summary ${i}`,
            sourceUrl: `${TEST_URL_PREFIX}selected-${i}`,
            sourceName: "Test",
            category: "NEWS",
            status: "SELECTED",
          },
        });
        const prompt = await createPrompt(topic.id, `Prompt for ${i}`, "NEWS");
        if (i < 3) {
          await ratePrompt(
            prompt.id,
            "POSITIVE",
            i < 2 ? `Note ${i}` : undefined
          );
        } else {
          await ratePrompt(prompt.id, "NEGATIVE");
        }
      }
    });

    afterAll(async () => {
      await cleanupTestData();
      await disconnectTestDb();
    });

    it("filters by rating", async () => {
      const result = await getSelectedTopicsPaginated({
        rating: "POSITIVE",
        search: TEST_CONTENT_PREFIX,
      });
      expect(result.topics.length).toBe(3);
    });

    it("filters by hasNotes", async () => {
      const result = await getSelectedTopicsPaginated({
        hasNotes: true,
        search: TEST_CONTENT_PREFIX,
      });
      expect(result.topics.length).toBe(2);
    });
  }
);
