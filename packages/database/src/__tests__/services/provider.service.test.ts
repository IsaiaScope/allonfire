import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deleteProvider,
  getActiveProvider,
  getProviders,
  getProviderWithDecryptedKey,
  setActiveProvider,
  upsertProvider,
} from "../../services/provider.service";
import {
  canConnectToDb,
  cleanupTestData,
  disconnectTestDb,
} from "../helpers/db-setup";
import { TEST_PROVIDER } from "../helpers/fixtures";

const MASKED_KEY_PATTERN = /^•+$/;
const dbAvailable = await canConnectToDb();

describe.skipIf(!dbAvailable)("provider.service", () => {
  let providerId: string;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectTestDb();
  });

  it("upsertProvider creates provider with encrypted key", async () => {
    const result = await upsertProvider(TEST_PROVIDER);
    providerId = result.id;
    expect(result.provider).toBe("ANTHROPIC");
    expect(result.model).toBe(TEST_PROVIDER.model);
    expect(result.isVerified).toBe(true);
    expect(result.apiKey).not.toBe(TEST_PROVIDER.apiKey);
    expect(result.lastVerifiedAt).not.toBeNull();
  });

  it("upsertProvider updates existing provider", async () => {
    const updated = await upsertProvider({
      ...TEST_PROVIDER,
      isVerified: false,
    });
    expect(updated.id).toBe(providerId);
    expect(updated.model).toBe(TEST_PROVIDER.model);
    expect(updated.isVerified).toBe(false);
  });

  it("getProviders returns providers with masked keys", async () => {
    const providers = await getProviders();
    expect(providers.length).toBeGreaterThanOrEqual(1);
    const anthropic = providers.find((p) => p.provider === "ANTHROPIC");
    expect(anthropic).toBeDefined();
    expect(anthropic?.apiKey).toMatch(MASKED_KEY_PATTERN);
  });

  it("getProviderWithDecryptedKey returns decrypted key", async () => {
    const provider = await getProviderWithDecryptedKey("ANTHROPIC");
    expect(provider).not.toBeNull();
    expect(provider?.apiKey).toBe(TEST_PROVIDER.apiKey);
  });

  it("setActiveProvider + getActiveProvider round-trip", async () => {
    await setActiveProvider(providerId);
    const active = await getActiveProvider();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(providerId);
    expect(active?.apiKey).toBe(TEST_PROVIDER.apiKey);
  });

  it("getActiveProvider returns null when no provider set", async () => {
    await cleanupTestData();
    const active = await getActiveProvider();
    expect(active).toBeNull();
  });

  it("deleteProvider removes provider", async () => {
    const created = await upsertProvider(TEST_PROVIDER);
    await deleteProvider(created.id);
    const provider = await getProviderWithDecryptedKey("ANTHROPIC");
    expect(provider).toBeNull();
  });
});
