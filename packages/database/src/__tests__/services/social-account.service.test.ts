import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../index";
import {
  deleteSocialAccount,
  getConnectedAccounts,
  getSocialAccount,
  upsertSocialAccount,
} from "../../services/social-account.service";
import {
  canConnectToDb,
  cleanupTestData,
  disconnectTestDb,
  TEST_EMAIL_SUFFIX,
} from "../helpers/db-setup";
import { TEST_SOCIAL_ACCOUNT } from "../helpers/fixtures";

const dbAvailable = await canConnectToDb();

let userId: string;

describe.skipIf(!dbAvailable)("social-account.service", () => {
  beforeAll(async () => {
    await cleanupTestData();
    const user = await prisma.user.create({
      data: {
        email: `social-test${TEST_EMAIL_SUFFIX}`,
        name: "Social Test User",
        emailVerified: true,
        role: "ADMIN",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  it("upsertSocialAccount creates account with encrypted tokens", async () => {
    const result = await upsertSocialAccount({
      userId,
      ...TEST_SOCIAL_ACCOUNT,
    });
    expect(result.platform).toBe("TWITTER");
    expect(result.accessToken).not.toBe(TEST_SOCIAL_ACCOUNT.accessToken);
    expect(result.refreshToken).not.toBe(TEST_SOCIAL_ACCOUNT.refreshToken);
    expect(result.platformUsername).toBe("testuser");
  });

  it("getSocialAccount returns decrypted tokens", async () => {
    const account = await getSocialAccount(userId, "TWITTER");
    expect(account).not.toBeNull();
    expect(account?.accessToken).toBe(TEST_SOCIAL_ACCOUNT.accessToken);
    expect(account?.refreshToken).toBe(TEST_SOCIAL_ACCOUNT.refreshToken);
  });

  it("getSocialAccount returns null for non-existent", async () => {
    const account = await getSocialAccount(userId, "LINKEDIN");
    expect(account).toBeNull();
  });

  it("upsertSocialAccount updates existing account", async () => {
    await upsertSocialAccount({
      userId,
      platform: "TWITTER",
      accessToken: "updated-access-token",
      refreshToken: "updated-refresh-token",
    });
    const account = await getSocialAccount(userId, "TWITTER");
    expect(account?.accessToken).toBe("updated-access-token");
    expect(account?.refreshToken).toBe("updated-refresh-token");
  });

  it("getConnectedAccounts returns public fields only", async () => {
    const accounts = await getConnectedAccounts(userId);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    const twitter = accounts.find((a) => a.platform === "TWITTER");
    expect(twitter).toBeDefined();
    expect(twitter?.platformUsername).toBeDefined();
    expect("accessToken" in (twitter ?? {})).toBe(false);
    expect("refreshToken" in (twitter ?? {})).toBe(false);
  });

  it("deleteSocialAccount removes account", async () => {
    await deleteSocialAccount(userId, "TWITTER");
    const account = await getSocialAccount(userId, "TWITTER");
    expect(account).toBeNull();
  });
});
