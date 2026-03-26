import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../index";
import {
  createPrompt,
  deletePrompt,
  getPositivePromptsByCategory,
  getPromptsByTopicId,
  ratePrompt,
  updatePromptNote,
} from "../../services/prompt.service";
import {
  canConnectToDb,
  cleanupTestData,
  disconnectTestDb,
  TEST_CONTENT_PREFIX,
  TEST_URL_PREFIX,
} from "../helpers/db-setup";

const dbAvailable = await canConnectToDb();

let topicId: string;

describe.skipIf(!dbAvailable)("prompt.service", () => {
  let promptId: string;

  beforeAll(async () => {
    await cleanupTestData();
    const topic = await prisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Prompt Test Topic`,
        summary: "Topic for testing prompt CRUD",
        sourceUrl: `${TEST_URL_PREFIX}prompt-topic`,
        sourceName: "Test Suite",
        category: "NEWS",
        status: "SELECTED",
      },
    });
    topicId = topic.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  it("createPrompt creates prompt linked to topic", async () => {
    const prompt = await createPrompt(
      topicId,
      "Generated news post about AI",
      "NEWS"
    );
    promptId = prompt.id;
    expect(prompt.topicId).toBe(topicId);
    expect(prompt.content).toBe("Generated news post about AI");
    expect(prompt.postType).toBe("NEWS");
    expect(prompt.rating).toBeNull();
  });

  it("getPromptsByTopicId returns prompts ordered by createdAt desc", async () => {
    await createPrompt(topicId, "Second prompt", "MEME");
    const prompts = await getPromptsByTopicId(topicId);
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < prompts.length; i++) {
      const prev = new Date(prompts[i - 1]?.createdAt ?? 0).getTime();
      const curr = new Date(prompts[i]?.createdAt ?? 0).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("ratePrompt sets rating, note, and ratedAt", async () => {
    const rated = await ratePrompt(promptId, "POSITIVE", "Excellent content");
    expect(rated.rating).toBe("POSITIVE");
    expect(rated.ratingNote).toBe("Excellent content");
    expect(rated.ratedAt).not.toBeNull();
  });

  it("ratePrompt with no note sets ratingNote to null", async () => {
    const rated = await ratePrompt(promptId, "NEGATIVE");
    expect(rated.rating).toBe("NEGATIVE");
    expect(rated.ratingNote).toBeNull();
  });

  it("updatePromptNote updates just the note", async () => {
    const updated = await updatePromptNote(promptId, "Updated note");
    expect(updated.ratingNote).toBe("Updated note");
    expect(updated.rating).toBe("NEGATIVE");
  });

  it("updatePromptNote with null clears the note", async () => {
    const updated = await updatePromptNote(promptId, null);
    expect(updated.ratingNote).toBeNull();
  });

  it("getPositivePromptsByCategory returns matching prompts", async () => {
    await ratePrompt(promptId, "POSITIVE", "Great");

    const otherTopic = await prisma.topic.create({
      data: {
        title: `${TEST_CONTENT_PREFIX}Learning Topic`,
        summary: "Topic for learning category",
        sourceUrl: `${TEST_URL_PREFIX}learning-prompt`,
        sourceName: "Test",
        category: "LEARNING",
        status: "SELECTED",
      },
    });
    const otherPrompt = await createPrompt(
      otherTopic.id,
      "Learning prompt",
      "LEARNING"
    );
    await ratePrompt(otherPrompt.id, "POSITIVE");

    const newsPrompts = await getPositivePromptsByCategory("NEWS");
    expect(newsPrompts.length).toBeGreaterThanOrEqual(1);
    for (const p of newsPrompts) {
      expect(p.topic?.category).toBe("NEWS");
    }
    expect(newsPrompts.length).toBeLessThanOrEqual(2);
  });

  it("deletePrompt removes prompt", async () => {
    await deletePrompt(promptId);
    const prompts = await getPromptsByTopicId(topicId);
    const found = prompts.find((p) => p.id === promptId);
    expect(found).toBeUndefined();
  });
});
