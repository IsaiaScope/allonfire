import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canConnect,
  cleanupTestTopics,
  disconnectTestDb,
  TEST_CONTENT_PREFIX,
  TEST_URL_PREFIX,
  testPrisma,
} from "../helpers/db-test-utils";

vi.mock("@/lib/server-auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "mock-session-user-id" },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const dbAvailable = await canConnect();

describe.skipIf(!dbAvailable)("topic actions", () => {
  beforeEach(async () => {
    await cleanupTestTopics();
  });

  afterAll(async () => {
    await cleanupTestTopics();
    await disconnectTestDb();
  });

  it("selectTopicAction transitions topic to SELECTED", async () => {
    const { selectTopicAction } = await import(
      "@/features/topics/actions/topics"
    );

    const topic = await testPrisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Select Me`,
        summary: "Topic to select",
        sourceUrl: `${TEST_URL_PREFIX}select-action`,
        sourceName: "Test",
        category: "NEWS",
        status: "AI_PICKED",
      },
    });

    const result = await selectTopicAction(topic.id);
    expect(result.success).toBe(true);

    const updated = await testPrisma.topic.findUnique({
      where: { id: topic.id },
    });
    expect(updated?.status).toBe("SELECTED");
  });

  it("selectTopicAction rejects invalid cuid2", async () => {
    const { selectTopicAction } = await import(
      "@/features/topics/actions/topics"
    );
    await expect(selectTopicAction("not-a-cuid2")).rejects.toThrow();
  });

  it("deleteTopicAction removes topic from DB", async () => {
    const { deleteTopicAction } = await import(
      "@/features/topics/actions/topics"
    );

    const topic = await testPrisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Delete Me`,
        summary: "Topic to delete",
        sourceUrl: `${TEST_URL_PREFIX}delete-action`,
        sourceName: "Test",
        category: "NEWS",
        status: "AI_PICKED",
      },
    });

    const result = await deleteTopicAction(topic.id);
    expect(result.success).toBe(true);

    const deleted = await testPrisma.topic.findUnique({
      where: { id: topic.id },
    });
    expect(deleted).toBeNull();
  });

  it("deleteAllTopicsAction deletes AI_PICKED topics by category", async () => {
    const { deleteAllTopicsAction } = await import(
      "@/features/topics/actions/topics"
    );

    await testPrisma.topic.createMany({
      data: [
        {
          title: `${TEST_CONTENT_PREFIX}News 1`,
          summary: "S",
          sourceUrl: `${TEST_URL_PREFIX}da1`,
          sourceName: "T",
          category: "NEWS",
          status: "AI_PICKED",
        },
        {
          title: `${TEST_CONTENT_PREFIX}News 2`,
          summary: "S",
          sourceUrl: `${TEST_URL_PREFIX}da2`,
          sourceName: "T",
          category: "NEWS",
          status: "AI_PICKED",
        },
        {
          title: `${TEST_CONTENT_PREFIX}Tool 1`,
          summary: "S",
          sourceUrl: `${TEST_URL_PREFIX}da3`,
          sourceName: "T",
          category: "TOOL_RELEASE",
          status: "AI_PICKED",
        },
      ],
    });

    const result = await deleteAllTopicsAction("NEWS");
    expect(result.success).toBe(true);

    const remaining = await testPrisma.topic.findMany({
      where: { sourceUrl: { startsWith: TEST_URL_PREFIX } },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.category).toBe("TOOL_RELEASE");
  });

  it("deleteAllSelectedTopicsAction deletes SELECTED topics", async () => {
    const { deleteAllSelectedTopicsAction } = await import(
      "@/features/topics/actions/topics"
    );

    await testPrisma.topic.createMany({
      data: [
        {
          title: `${TEST_CONTENT_PREFIX}Selected 1`,
          summary: "S",
          sourceUrl: `${TEST_URL_PREFIX}ds1`,
          sourceName: "T",
          category: "NEWS",
          status: "SELECTED",
        },
        {
          title: `${TEST_CONTENT_PREFIX}Not Selected`,
          summary: "S",
          sourceUrl: `${TEST_URL_PREFIX}ds2`,
          sourceName: "T",
          category: "NEWS",
          status: "AI_PICKED",
        },
      ],
    });

    const result = await deleteAllSelectedTopicsAction();
    expect(result.success).toBe(true);

    const remaining = await testPrisma.topic.findMany({
      where: { sourceUrl: { startsWith: TEST_URL_PREFIX } },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.status).toBe("AI_PICKED");
  });

  it("deleteAllSelectedTopicsAction with rating filter", async () => {
    const { deleteAllSelectedTopicsAction } = await import(
      "@/features/topics/actions/topics"
    );

    const topic1 = await testPrisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Rated Selected`,
        summary: "S",
        sourceUrl: `${TEST_URL_PREFIX}dsr1`,
        sourceName: "T",
        category: "NEWS",
        status: "SELECTED",
      },
    });
    await testPrisma.prompt.create({
      data: {
        topicId: topic1.id,
        content: "Positive prompt",
        rating: "POSITIVE",
        ratedAt: new Date(),
      },
    });

    const topic2 = await testPrisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Negative Selected`,
        summary: "S",
        sourceUrl: `${TEST_URL_PREFIX}dsr2`,
        sourceName: "T",
        category: "NEWS",
        status: "SELECTED",
      },
    });
    await testPrisma.prompt.create({
      data: {
        topicId: topic2.id,
        content: "Negative prompt",
        rating: "NEGATIVE",
        ratedAt: new Date(),
      },
    });

    const result = await deleteAllSelectedTopicsAction({ rating: "POSITIVE" });
    expect(result.success).toBe(true);

    const remaining = await testPrisma.topic.findMany({
      where: { sourceUrl: { startsWith: TEST_URL_PREFIX } },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.title).toContain("Negative Selected");
  });
});
