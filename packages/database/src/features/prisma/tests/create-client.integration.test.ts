// @module-tag integration

import { env } from "../../../environment/environment";
import { DATABASE } from "../constants/prisma";
import { createPrismaClient } from "../create-client";

/** A connect that gives up is allowed this much beyond the timeout. */
const MARGIN_MS = 3000;
/** Not routable: nothing answers, so only the timeout ends the connect. */
const UNREACHABLE_URL = "postgresql://nobody:nothing@10.255.255.1:5432/none";

describe("createPrismaClient", () => {
  it("answers a query on the Test database", async () => {
    const client = createPrismaClient(env.DATABASE_URL);
    try {
      expect(await client.$queryRaw`SELECT 1 AS one`).toEqual([{ one: 1 }]);
    } finally {
      await client.$disconnect();
    }
  });

  it(
    "gives up on an unreachable host within the connect timeout",
    async () => {
      const client = createPrismaClient(UNREACHABLE_URL);
      const started = Date.now();
      try {
        await expect(client.$queryRaw`SELECT 1`).rejects.toThrow();
      } finally {
        await client.$disconnect();
      }
      expect(Date.now() - started).toBeLessThan(
        DATABASE.TIMEOUT.CONNECT_MS + MARGIN_MS
      );
    },
    DATABASE.TIMEOUT.CONNECT_MS + 2 * MARGIN_MS
  );
});
