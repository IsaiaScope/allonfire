import { PrismaClient } from "@allonfire/database";

export const TEST_URL_PREFIX = "https://__test__.allonfire.com/";
export const TEST_CONTENT_PREFIX = "__test__:";
export const TEST_EMAIL_SUFFIX = "@test-suite.allonfire.com";

export const testPrisma = new PrismaClient();

export async function canConnect(): Promise<boolean> {
  try {
    await testPrisma.$connect();
    return true;
  } catch {
    return false;
  }
}

export async function cleanupTestTopics() {
  await Promise.all([
    testPrisma.webhookLog.deleteMany({
      where: { endpoint: { contains: "__test__" } },
    }),
    testPrisma.post.deleteMany({
      where: { content: { startsWith: TEST_CONTENT_PREFIX } },
    }),
  ]);
  await testPrisma.prompt.deleteMany({
    where: { topic: { sourceUrl: { startsWith: TEST_URL_PREFIX } } },
  });
  await testPrisma.topic.deleteMany({
    where: { sourceUrl: { startsWith: TEST_URL_PREFIX } },
  });
}

export async function cleanupTestUsers() {
  await testPrisma.session.deleteMany({
    where: { user: { email: { endsWith: TEST_EMAIL_SUFFIX } } },
  });
  await testPrisma.account.deleteMany({
    where: { user: { email: { endsWith: TEST_EMAIL_SUFFIX } } },
  });
  await testPrisma.user.deleteMany({
    where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
  });
}

export async function disconnectTestDb() {
  await testPrisma.$disconnect();
}
