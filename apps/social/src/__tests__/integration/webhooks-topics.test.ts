import { PrismaClient } from "@allonfire/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "../../app/api/webhooks/topics/route";

const prisma = new PrismaClient();

const API_URL = "http://localhost:3100/api/webhooks/topics";
const AUTH_HEADER = `Bearer ${process.env.N8N_API_KEY}`;

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validTopic = {
  title: "Test Topic: Vitest Integration",
  summary: "A topic created during CI integration testing",
  sourceUrl: "https://example.com/test-topic-ci-unique",
  sourceName: "CI Test Suite",
  category: "NEWS" as const,
};

describe("POST /api/webhooks/topics", () => {
  beforeAll(async () => {
    await prisma.webhookLog.deleteMany({});
    await prisma.topic.deleteMany({});
  });

  afterAll(async () => {
    await prisma.webhookLog.deleteMany({});
    await prisma.topic.deleteMany({});
    await prisma.$disconnect();
  });

  it("rejects requests without auth header", async () => {
    const request = makeRequest({ topics: [validTopic] });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects requests with wrong token", async () => {
    const request = makeRequest(
      { topics: [validTopic] },
      {
        Authorization: "Bearer wrong-token",
      }
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("ingests valid topics and verifies in DB", async () => {
    const request = makeRequest(
      { topics: [validTopic] },
      {
        Authorization: AUTH_HEADER,
      }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ingested).toBe(1);
    expect(body.duplicatesSkipped).toBe(0);

    const topic = await prisma.topic.findFirst({
      where: { sourceUrl: validTopic.sourceUrl },
    });
    expect(topic).not.toBeNull();
    expect(topic?.title).toBe(validTopic.title);
    expect(topic?.summary).toBe(validTopic.summary);
    expect(topic?.sourceName).toBe(validTopic.sourceName);
    expect(topic?.category).toBe(validTopic.category);
    expect(topic?.status).toBe("DISCOVERED");

    const log = await prisma.webhookLog.findFirst({
      where: { endpoint: "/api/webhooks/topics", status: 200 },
    });
    expect(log).not.toBeNull();
    expect(log?.method).toBe("POST");
  });

  it("skips duplicate topics", async () => {
    const request = makeRequest(
      { topics: [validTopic] },
      {
        Authorization: AUTH_HEADER,
      }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ingested).toBe(0);
    expect(body.duplicatesSkipped).toBe(1);
  });

  it("rejects invalid payload", async () => {
    const request = makeRequest(
      { topics: [{ title: "" }] },
      {
        Authorization: AUTH_HEADER,
      }
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
