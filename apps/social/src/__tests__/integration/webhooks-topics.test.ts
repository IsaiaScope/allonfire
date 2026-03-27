import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "../../app/api/webhooks/topics/route";
import {
  canConnect,
  cleanupTestTopics,
  disconnectTestDb,
  TEST_URL_PREFIX,
  testPrisma,
} from "../helpers/db-test-utils";
import { makeRequest, withAuth } from "../helpers/mock-request";

const dbAvailable = await canConnect();

const validTopic = {
  title: "__test__:Vitest Integration Topic",
  summary: "A topic created during integration testing",
  sourceUrl: `${TEST_URL_PREFIX}ci-unique-topic`,
  sourceName: "Test Suite",
  category: "NEWS" as const,
};

describe.skipIf(!dbAvailable)("POST /api/webhooks/topics", () => {
  beforeAll(async () => {
    await cleanupTestTopics();
  });

  afterAll(async () => {
    await cleanupTestTopics();
    await disconnectTestDb();
  });

  it("rejects requests without auth header", async () => {
    const request = makeRequest("/api/webhooks/topics", {
      topics: [validTopic],
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects requests with wrong token", async () => {
    const request = makeRequest(
      "/api/webhooks/topics",
      { topics: [validTopic] },
      { Authorization: "Bearer wrong-token" }
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("ingests valid topics and verifies in DB", async () => {
    const request = makeRequest(
      "/api/webhooks/topics",
      { topics: [validTopic] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ingested).toBe(1);
    expect(body.duplicatesSkipped).toBe(0);

    const topic = await testPrisma.topic.findFirst({
      where: { sourceUrl: validTopic.sourceUrl },
    });
    expect(topic).not.toBeNull();
    expect(topic?.title).toBe(validTopic.title);
    expect(topic?.status).toBe("DISCOVERED");

    const log = await testPrisma.webhookLog.findFirst({
      where: { endpoint: "/api/webhooks/topics", status: 200 },
    });
    expect(log).not.toBeNull();
    expect(log?.method).toBe("POST");
  });

  it("skips duplicate topics", async () => {
    const request = makeRequest(
      "/api/webhooks/topics",
      { topics: [validTopic] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ingested).toBe(0);
    expect(body.duplicatesSkipped).toBe(1);
  });

  it("rejects invalid payload", async () => {
    const request = makeRequest(
      "/api/webhooks/topics",
      { topics: [{ title: "" }] },
      withAuth()
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
