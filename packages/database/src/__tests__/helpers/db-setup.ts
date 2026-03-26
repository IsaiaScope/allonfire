import { PrismaClient } from "../../../generated/prisma/client";

export const testPrisma = new PrismaClient();

export const TEST_URL_PREFIX = "https://__test__.allonfire.com/";
export const TEST_EMAIL_SUFFIX = "@test-suite.allonfire.com";
export const TEST_MODEL_PREFIX = "__test__:";
export const TEST_ENDPOINT_PREFIX = "/__test__/";
export const TEST_CONTENT_PREFIX = "__test__:";

export async function canConnectToDb(): Promise<boolean> {
  try {
    await testPrisma.$connect();
    return true;
  } catch {
    return false;
  }
}

export async function cleanupTestData() {
  // Independent deletes (no FK deps between them)
  await Promise.all([
    testPrisma.webhookLog.deleteMany({
      where: { endpoint: { startsWith: TEST_ENDPOINT_PREFIX } },
    }),
    testPrisma.post.deleteMany({
      where: { content: { startsWith: TEST_CONTENT_PREFIX } },
    }),
    testPrisma.socialAccount.deleteMany({
      where: { user: { email: { endsWith: TEST_EMAIL_SUFFIX } } },
    }),
    testPrisma.session.deleteMany({
      where: { user: { email: { endsWith: TEST_EMAIL_SUFFIX } } },
    }),
    testPrisma.account.deleteMany({
      where: { user: { email: { endsWith: TEST_EMAIL_SUFFIX } } },
    }),
  ]);

  // FK-dependent: prompts reference topics
  await testPrisma.prompt.deleteMany({
    where: { topic: { sourceUrl: { startsWith: TEST_URL_PREFIX } } },
  });

  // Now safe to delete topics and users
  await Promise.all([
    testPrisma.topic.deleteMany({
      where: { sourceUrl: { startsWith: TEST_URL_PREFIX } },
    }),
    testPrisma.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    }),
  ]);

  // Clean up test providers (reset settings first)
  const testProviders = await testPrisma.aiProvider.findMany({
    where: { model: { startsWith: TEST_MODEL_PREFIX } },
    select: { id: true },
  });
  if (testProviders.length > 0) {
    const testProviderIds = testProviders.map((p) => p.id);
    await testPrisma.settings.updateMany({
      where: { activeProviderId: { in: testProviderIds } },
      data: { activeProviderId: null },
    });
  }
  await testPrisma.aiProvider.deleteMany({
    where: { model: { startsWith: TEST_MODEL_PREFIX } },
  });
}

export async function disconnectTestDb() {
  await testPrisma.$disconnect();
}
