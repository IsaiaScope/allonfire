import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  canConnect,
  cleanupTestTopics,
  disconnectTestDb,
  TEST_CONTENT_PREFIX,
  TEST_URL_PREFIX,
  testPrisma,
} from "../helpers/db-test-utils";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "mock-user-id" },
      }),
    },
  },
}));

const { auth } = await import("@/lib/auth");

const dbAvailable = await canConnect();

const BASE_URL = "http://localhost:3100/api/topics/discover";

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

const BASE_TIME = new Date("2025-01-01T00:00:00Z").getTime();

const TEST_AI_PICKED = [
  {
    title: `${TEST_CONTENT_PREFIX}Topic A`,
    summary: "S",
    sourceUrl: `${TEST_URL_PREFIX}d1`,
    sourceName: "HN",
    category: "NEWS" as const,
  },
  {
    title: `${TEST_CONTENT_PREFIX}Topic B`,
    summary: "S",
    sourceUrl: `${TEST_URL_PREFIX}d2`,
    sourceName: "HN",
    category: "NEWS" as const,
  },
  {
    title: `${TEST_CONTENT_PREFIX}Topic C greenboost`,
    summary: "S",
    sourceUrl: `${TEST_URL_PREFIX}d3`,
    sourceName: "Reddit",
    category: "TOOL_RELEASE" as const,
  },
  {
    title: `${TEST_CONTENT_PREFIX}Topic D`,
    summary: "S",
    sourceUrl: `${TEST_URL_PREFIX}d4`,
    sourceName: "GH",
    category: "AI_UPDATE" as const,
  },
  {
    title: `${TEST_CONTENT_PREFIX}Topic E`,
    summary: "S",
    sourceUrl: `${TEST_URL_PREFIX}d5`,
    sourceName: "GH",
    category: "TOOL_RELEASE" as const,
  },
];

describe.skipIf(!dbAvailable)("GET /api/topics/discover", () => {
  beforeAll(async () => {
    await cleanupTestTopics();
    await testPrisma.topic.createMany({
      data: TEST_AI_PICKED.map((topic, i) => ({
        ...topic,
        status: "AI_PICKED" as const,
        discoveredAt: new Date(BASE_TIME + i * 1000),
      })),
    });
  });

  afterAll(async () => {
    await cleanupTestTopics();
    await disconnectTestDb();
  });

  it("rejects unauthenticated request", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
  });

  it("returns first page with totalCount", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");

    const response = await GET(
      makeGetRequest({ limit: "3", search: TEST_CONTENT_PREFIX })
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.topics).toHaveLength(3);
    expect(body.totalCount).toBe(5);
    expect(body.nextCursor).not.toBeNull();
  });

  it("paginates with cursor", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");

    const firstResponse = await GET(
      makeGetRequest({ limit: "3", search: TEST_CONTENT_PREFIX })
    );
    const firstBody = await firstResponse.json();

    const secondResponse = await GET(
      makeGetRequest({
        limit: "3",
        cursor: firstBody.nextCursor,
        search: TEST_CONTENT_PREFIX,
      })
    );
    const secondBody = await secondResponse.json();

    expect(secondBody.topics.length).toBe(2);
    expect(secondBody.totalCount).toBeNull();

    const firstIds = new Set(firstBody.topics.map((t: { id: string }) => t.id));
    for (const t of secondBody.topics) {
      expect(firstIds.has(t.id)).toBe(false);
    }
  });

  it("filters by category", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");

    const response = await GET(
      makeGetRequest({ category: "TOOL_RELEASE", search: TEST_CONTENT_PREFIX })
    );
    const body = await response.json();

    expect(body.topics.length).toBe(2);
    for (const topic of body.topics) {
      expect(topic.category).toBe("TOOL_RELEASE");
    }
  });

  it("searches by title case-insensitive", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");

    const response = await GET(
      makeGetRequest({ search: `${TEST_CONTENT_PREFIX}Topic C greenboost` })
    );
    const body = await response.json();

    expect(body.topics).toHaveLength(1);
    expect(body.topics[0].title.toLowerCase()).toContain("greenboost");
  });

  it("sorts by oldest", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");

    const response = await GET(
      makeGetRequest({
        sort: "oldest",
        limit: "50",
        search: TEST_CONTENT_PREFIX,
      })
    );
    const body = await response.json();

    for (let i = 1; i < body.topics.length; i++) {
      const prev = new Date(body.topics[i - 1].discoveredAt).getTime();
      const curr = new Date(body.topics[i].discoveredAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("rejects invalid params", async () => {
    const { GET } = await import("@/app/api/topics/discover/route");

    const response = await GET(makeGetRequest({ limit: "-1" }));
    expect(response.status).toBe(400);
  });
});
